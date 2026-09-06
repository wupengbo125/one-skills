#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/wiki.py - 个人 Wiki FTS5 全文检索与索引同步脚本 (参考 one-free-me 架构)

功能：
1. search <关键词>: BM25 全文检索 onewiki 文档，输出高亮片段与相关度评分
2. sync <相对路径>: 增量同步单篇 Markdown 到 .fts.db（文件删除时自动清理索引）
3. rebuild: 全量扫描 onewiki/ 目录并重建 .fts.db
"""

import os
import sys
import re
import sqlite3

def get_repo_dir():
    custom = os.environ.get("ONE_LLMWIKI_DIR")
    if custom:
        p = os.path.abspath(os.path.expanduser(custom))
        if os.path.isdir(p):
            return p
    cur = os.path.abspath(".")
    while True:
        if os.path.isdir(os.path.join(cur, "onewiki")):
            return cur
        parent = os.path.dirname(cur)
        if parent == cur:
            break
        cur = parent
    return os.path.abspath(".")

def get_db_path(repo_dir):
    return os.path.join(repo_dir, ".fts.db")

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

def cmd_sync(rel_path):
    repo_dir = get_repo_dir()
    if rel_path.startswith("./"):
        rel_path = rel_path[2:]
    full_path = os.path.join(repo_dir, rel_path)

    if not os.path.isfile(full_path):
        conn = get_db_connection(repo_dir)
        conn.execute("DELETE FROM docs_fts WHERE path = ?", (rel_path,))
        conn.commit()
        conn.close()
        print(f"🗑️ 已从索引库移除已删除文档: {rel_path}")
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
        elif line_s.startswith("title:"):
            title = line_s[6:].strip().strip("\"'")
            break

    parts = rel_path.split(os.sep)
    category = parts[1] if len(parts) > 2 and parts[0] == "onewiki" else (parts[0] if len(parts) > 1 else "root")

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
    repo_dir = get_repo_dir()
    db_path = get_db_path(repo_dir)
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass

    conn = get_db_connection(repo_dir)
    target_dir = os.path.join(repo_dir, "onewiki")
    if not os.path.isdir(target_dir):
        target_dir = repo_dir

    count = 0
    for root, dirs, files in os.walk(target_dir):
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
                    elif line_s.startswith("title:"):
                        title = line_s[6:].strip().strip("\"'")
                        break

                parts = rel_path.split(os.sep)
                category = parts[1] if len(parts) > 2 and parts[0] == "onewiki" else (parts[0] if len(parts) > 1 else "root")

                tok_title = tokenize(title)
                tok_content = tokenize(content)

                conn.execute(
                    "INSERT INTO docs_fts(path, title, category, content) VALUES (?, ?, ?, ?)",
                    (rel_path, tok_title, category, tok_content)
                )
                count += 1

    conn.commit()
    conn.close()
    print(f"🎉 索引全量重建完成，已索引 {count} 篇 Wiki 页面 -> {db_path}")

def cmd_search(query_str):
    repo_dir = get_repo_dir()
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
        LIMIT 10;
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
        print(f"🔍 未检索到关于 \"{query_str}\" 的内容。")
        return

    print(f"⚡ [BM25 检索命中 {len(rows)} 条] 关键词: {query_str}")
    for idx, row in enumerate(rows, 1):
        rel_path, hl_title, category, snip, score = row
        clean_snip = re.sub(r'[\r\n]+', ' ', snip).strip()
        print(f"\n{idx}. 📄 {rel_path} (类别: {category}) [评分: {score:.2f}]")
        print(f"   摘要: {clean_snip}")

def print_help():
    print("""scripts/wiki.py - 个人 Wiki FTS5 全文检索与索引同步脚本

用法:
  python3 scripts/wiki.py <子命令> [参数...]

命令:
  search <关键词>       使用 BM25 / FTS5 检索 Wiki 文档
  <关键词>              快捷检索模式（未输入子命令时默认检索）
  sync <文件相对路径>   增量同步单篇文档到 .fts.db 索引（已删除文件自动移出索引）
  rebuild               全量扫描 onewiki/ 并重建 .fts.db 索引
  help                  显示此帮助信息
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
            print(">>> 请指定待同步的文件相对路径，如: python3 scripts/wiki.py sync 'onewiki/stocks/concepts/xxx.md'")
            sys.exit(1)
        cmd_sync(sys.argv[2])
    elif cmd == "search":
        if len(sys.argv) < 3:
            print(">>> 请输入检索关键词，如: python3 scripts/wiki.py search '量化'")
            sys.exit(1)
        cmd_search(" ".join(sys.argv[2:]))
    else:
        cmd_search(" ".join(sys.argv[1:]))

if __name__ == "__main__":
    main()
