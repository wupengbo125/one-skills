#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/free_me.py - 海马体记忆检索与维护脚本

功能：
1. BM25 全文检索 (search)：检索海马体文档，按相关度排序并高亮输出片段
2. 近期活跃流水 (recent / touch)：更新实体访问时间戳为今天并置顶，自动双阈值清理
3. 近期记忆治理 (clean)：执行 60 天 / 100 条双阈值淘汰，移除过期旧记录
4. 索引维护 (sync / rebuild)：与海马体 SQLite FTS5 索引库同步
"""

import os
import sys
import re
import sqlite3
import datetime

DEFAULT_HIPPOCAMPUS_DIR = os.path.expanduser(
    os.environ.get("ONE_HIPPOCAMPUS_DIR", "~/onespace/github/one-hippocampus")
)

def get_hippocampus_dir():
    custom = os.environ.get("ONE_HIPPOCAMPUS_DIR")
    if custom:
        p = os.path.abspath(os.path.expanduser(custom))
        if os.path.isdir(p):
            return p
    d = os.path.abspath(DEFAULT_HIPPOCAMPUS_DIR)
    if not os.path.isdir(d):
        alt = "/home/ctyun/onespace/github/one-hippocampus"
        if os.path.isdir(alt):
            return alt
    return d

def get_db_path(repo_dir):
    return os.path.join(repo_dir, ".fts.db")

# ==============================================================================
# BM25 与分词核心
# ==============================================================================

def tokenize(text):
    if not text:
        return ""
    text = re.sub(r'[\r\n\t]+', ' ', text)
    tokens = []
    i = 0
    n = len(text)
    while i < n:
        char = text[i]
        if '\u4e00' <= char <= '\u9fff':
            tokens.append(char)
            if i + 1 < n and '\u4e00' <= text[i+1] <= '\u9fff':
                tokens.append(char + text[i+1])
            i += 1
        elif char.isalnum() or char in ['_', '-']:
            start = i
            while i < n and (text[i].isalnum() or text[i] in ['_', '-']):
                i += 1
            word = text[start:i].lower()
            tokens.append(word)
        else:
            i += 1
    return " ".join(tokens)

def get_db_connection(repo_dir):
    db_path = get_db_path(repo_dir)
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("""
        CREATE VIRTUAL TABLE IF NOT EXISTS docs_fts USING fts5(
            path UNINDEXED,
            title,
            category,
            content,
            tokenize='unicode61'
        );
    """)
    conn.commit()
    return conn

# ==============================================================================
# 命令实现：search, sync, rebuild, recent, clean
# ==============================================================================

def cmd_sync(rel_path):
    repo_dir = get_hippocampus_dir()
    full_path = os.path.join(repo_dir, rel_path)

    if not os.path.isfile(full_path):
        conn = get_db_connection(repo_dir)
        conn.execute("DELETE FROM docs_fts WHERE path = ?", (rel_path,))
        conn.commit()
        conn.close()
        print(f"🗑️ 已从索引移除已删除文档: {rel_path}")
        return

    try:
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        print(f"❌ 读取文件失败: {e}")
        return

    title = os.path.basename(rel_path)
    for line in content.splitlines():
        line_s = line.strip()
        if line_s.startswith("# "):
            title = line_s[2:].strip()
            break

    parts = rel_path.split(os.sep)
    category = parts[0] if len(parts) > 1 else "root"

    tok_title = tokenize(title)
    tok_content = tokenize(content)

    conn = get_db_connection(repo_dir)
    conn.execute("DELETE FROM docs_fts WHERE path = ?", (rel_path,))
    conn.execute(
        "INSERT INTO docs_fts(path, title, category, content) VALUES (?, ?, ?, ?)",
        (rel_path, tok_title, category, tok_content)
    )
    conn.commit()
    conn.close()
    print(f"✅ 已增量同步至索引: {rel_path} -> .fts.db")

def cmd_rebuild():
    repo_dir = get_hippocampus_dir()
    db_path = get_db_path(repo_dir)
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass

    conn = get_db_connection(repo_dir)
    count = 0
    for root, dirs, files in os.walk(repo_dir):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for file in files:
            if file.endswith(".md"):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, repo_dir)
                try:
                    with open(full_path, "r", encoding="utf-8") as f:
                        content = f.read()
                except Exception:
                    continue

                title = file
                for line in content.splitlines():
                    line_s = line.strip()
                    if line_s.startswith("# "):
                        title = line_s[2:].strip()
                        break

                parts = rel_path.split(os.sep)
                category = parts[0] if len(parts) > 1 else "root"

                tok_title = tokenize(title)
                tok_content = tokenize(content)

                conn.execute(
                    "INSERT INTO docs_fts(path, title, category, content) VALUES (?, ?, ?, ?)",
                    (rel_path, tok_title, category, tok_content)
                )
                count += 1

    conn.commit()
    conn.close()
    print(f"🎉 索引全量重建完成，已索引 {count} 篇海马体文档 -> {db_path}")

def cmd_search(query_str):
    repo_dir = get_hippocampus_dir()
    db_path = get_db_path(repo_dir)
    if not os.path.isfile(db_path):
        print(">>> 索引库不存在，自动执行首次全量建库...")
        cmd_rebuild()

    raw_tokens = tokenize(query_str).split()
    if not raw_tokens:
        print(">>> 请输入有效的检索关键词")
        return

    fts_query = " OR ".join([f'"{t}"' for t in raw_tokens])

    conn = get_db_connection(repo_dir)
    sql = """
        SELECT path,
               highlight(docs_fts, 1, '【', '】') as hl_title,
               category,
               snippet(docs_fts, 3, '【', '】', '...', 16) as snippet_text,
               bm25(docs_fts, 5.0, 1.0, 2.0) as rank
        FROM docs_fts
        WHERE docs_fts MATCH ?
        ORDER BY rank
        LIMIT 5;
    """
    try:
        cursor = conn.execute(sql, (fts_query,))
        rows = cursor.fetchall()
    except Exception as e:
        print(f"❌ 检索失败: {e}")
        conn.close()
        return

    conn.close()

    if not rows:
        print(f"🔍 未检索到关于 \"{query_str}\" 的精确结果。建议参考 INDEX.md 进行语义查找。")
        return

    print(f"⚡ [BM25 检索命中 {len(rows)} 条] 关键词: {query_str}")
    for idx, row in enumerate(rows, 1):
        rel_path, hl_title, category, snip, score = row
        clean_snip = re.sub(r'[\r\n]+', ' ', snip).strip()
        print(f"\n{idx}. 📄 {rel_path} (类别: {category}) [评分: {score:.2f}]")
        print(f"   摘要: {clean_snip}")

def cmd_recent(entity, pointer=""):
    repo_dir = get_hippocampus_dir()
    recent_file = os.path.join(repo_dir, "recent.md")
    if not os.path.isfile(recent_file):
        print(f"❌ 未找到 recent.md: {recent_file}")
        return

    try:
        with open(recent_file, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except Exception as e:
        print(f"❌ 读取 recent.md 失败: {e}")
        return

    header_lines = []
    table_rows = []
    in_table = False

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("|") and ("---" in stripped or "实体" in stripped or "访问时间" in stripped):
            header_lines.append(line)
            in_table = True
        elif in_table and stripped.startswith("|"):
            table_rows.append(line)
        else:
            if not in_table:
                header_lines.append(line)

    today_str = datetime.datetime.now().strftime("%Y-%m-%d")
    cutoff_date = (datetime.datetime.now() - datetime.timedelta(days=60)).strftime("%Y-%m-%d")

    target_entity = entity.strip()
    target_pointer = pointer.strip() if pointer else ""

    entries = []
    found = False

    for row in table_rows:
        parts = [p.strip() for p in row.strip().split("|")[1:-1]]
        if len(parts) >= 3:
            e_name, e_pointer, e_date = parts[0], parts[1], parts[2]
            m = re.search(r'\d{4}-\d{2}-\d{2}', e_date)
            d_val = m.group(0) if m else "1970-01-01"

            if e_name == target_entity or target_entity == e_name.strip("`*"):
                found = True
                final_ptr = target_pointer if target_pointer else e_pointer
                entries.append({
                    "entity": e_name,
                    "pointer": final_ptr,
                    "date": today_str,
                    "is_target": True
                })
            else:
                entries.append({
                    "entity": e_name,
                    "pointer": e_pointer,
                    "date": d_val,
                    "is_target": False
                })

    if not found:
        entries.insert(0, {
            "entity": target_entity,
            "pointer": target_pointer if target_pointer else "-",
            "date": today_str,
            "is_target": True
        })

    target_items = [item for item in entries if item.get("is_target")]
    other_items = [item for item in entries if not item.get("is_target")]
    other_items.sort(key=lambda x: x["date"], reverse=True)

    sorted_entries = target_items + other_items

    # 1. 淘汰超 60 天记录
    valid_entries = []
    evicted_old = 0
    for item in sorted_entries:
        if item["date"] >= cutoff_date or item.get("is_target"):
            valid_entries.append(item)
        else:
            evicted_old += 1
            print(f"  [-] 超期淘汰 (>60天): {item['entity']} ({item['date']})")

    # 2. 淘汰超 100 条限制
    evicted_excess = 0
    if len(valid_entries) > 100:
        evicted_excess = len(valid_entries) - 100
        valid_entries = valid_entries[:100]
        print(f"  [-] 超量淘汰: 截断超出 100 条上限的陈旧记录 {evicted_excess} 条")

    new_rows = [f"| {item['entity']} | {item['pointer']} | {item['date']} |\n" for item in valid_entries]

    with open(recent_file, "w", encoding="utf-8") as f:
        f.writelines(header_lines)
        f.writelines(new_rows)

    print(f"⚡ 近期活跃流水已记录并置顶: {target_entity} ({today_str})")
    cmd_sync("recent.md")

def cmd_clean_recent():
    repo_dir = get_hippocampus_dir()
    recent_file = os.path.join(repo_dir, "recent.md")
    if not os.path.isfile(recent_file):
        print(f">>> 文件不存在: {recent_file}")
        return

    try:
        with open(recent_file, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except Exception as e:
        print(f"❌ 读取 recent.md 失败: {e}")
        return

    header_lines = []
    table_rows = []
    in_table = False

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("|") and ("---" in stripped or "实体" in stripped or "访问时间" in stripped):
            header_lines.append(line)
            in_table = True
        elif in_table and stripped.startswith("|"):
            table_rows.append(line)
        else:
            if not in_table:
                header_lines.append(line)

    now = datetime.datetime.now()
    cutoff_date = (now - datetime.timedelta(days=60)).strftime("%Y-%m-%d")

    valid_entries = []
    for row in table_rows:
        parts = [p.strip() for p in row.strip().split("|")[1:-1]]
        if len(parts) >= 3:
            entity, pointer, date_str = parts[0], parts[1], parts[2]
            m = re.search(r'\d{4}-\d{2}-\d{2}', date_str)
            if m:
                d_val = m.group(0)
                if d_val >= cutoff_date:
                    valid_entries.append((d_val, entity, pointer, row.strip()))
                else:
                    print(f"  [-] 超期淘汰 (>60天): {entity} ({d_val})")
            else:
                valid_entries.append(("1970-01-01", entity, pointer, row.strip()))

    valid_entries.sort(key=lambda x: x[0], reverse=True)

    evicted_excess = 0
    if len(valid_entries) > 100:
        evicted_excess = len(valid_entries) - 100
        valid_entries = valid_entries[:100]
        print(f"  [-] 超量淘汰: 截断超出 100 条上限的旧记录 {evicted_excess} 条")

    new_rows = [f"{r}\n" for _, _, _, r in valid_entries]
    with open(recent_file, "w", encoding="utf-8") as f:
        f.writelines(header_lines)
        f.writelines(new_rows)

    cmd_sync("recent.md")
    print(f"🧹 近期记忆治理完成，当前保留 {len(new_rows)} 条有效记忆。")

# ==============================================================================
# CLI 入口
# ==============================================================================

def print_help():
    print("""scripts/free_me.py - 海马体记忆检索与维护脚本

用法:
  python3 scripts/free_me.py <子命令> [参数...]

命令:
  search <关键词>                 使用 BM25 检索海马体文档
  <关键词>                        快捷检索模式（未输入子命令时默认检索）
  recent <实体/主题> [指针/简述]  近期活跃流水打卡，刷新访问时间并置顶 (别名: touch)
  clean                           治理近期记忆 (执行 60 天 / 100 条双阈值淘汰)
  sync <文件相对路径>             增量同步单篇文档到 .fts.db 索引
  rebuild                         全量重新扫描并重建海马体 .fts.db 索引
  help                            显示此帮助信息

示例:
  python3 scripts/free_me.py search "Tailscale 代理"
  python3 scripts/free_me.py recent "用户画像" "system/profile.md"
  python3 scripts/free_me.py clean
  python3 scripts/free_me.py sync "recent.md"
  python3 scripts/free_me.py rebuild
""")

def main():
    if len(sys.argv) < 2:
        print_help()
        sys.exit(0)

    cmd = sys.argv[1]

    if cmd in ["-h", "--help", "help"]:
        print_help()
    elif cmd == "rebuild":
        cmd_rebuild()
    elif cmd == "sync":
        if len(sys.argv) < 3:
            print(">>> 请指定待同步的文件相对路径，如: python3 scripts/free_me.py sync 'memory/xxx.md'")
            sys.exit(1)
        cmd_sync(sys.argv[2])
    elif cmd in ["recent", "touch"]:
        if len(sys.argv) < 3:
            print(">>> 请指定实体名称，如: python3 scripts/free_me.py recent '<实体/主题>' '[指针/简述]'")
            sys.exit(1)
        entity = sys.argv[2]
        pointer = sys.argv[3] if len(sys.argv) > 3 else ""
        cmd_recent(entity, pointer)
    elif cmd in ["clean", "clean-recent"]:
        cmd_clean_recent()
    elif cmd == "search":
        if len(sys.argv) < 3:
            print(">>> 请输入检索关键词，如: python3 scripts/free_me.py search '代理'")
            sys.exit(1)
        cmd_search(" ".join(sys.argv[2:]))
    else:
        cmd_search(" ".join(sys.argv[1:]))

if __name__ == "__main__":
    main()
