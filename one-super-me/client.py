#!/usr/bin/env python3
"""
One Super-Me Client (客户端与引擎)
职责：
1. BM25 全文检索：连接海马体数据仓 (.fts.db)，支持多级短语/字词 BM25 极速查询
2. 索引维护：增量同步单篇文档 (sync) 或全量重建 (rebuild)
3. 近期记忆治理：执行 recent.md 双阈值（60天 / 100条）淘汰
"""

import os
import re
import sys
import sqlite3
from datetime import datetime, timedelta

DEFAULT_HIPPOCAMPUS_DIR = os.path.expanduser(
    os.environ.get("ONE_HIPPOCAMPUS_DIR", "~/onespace/github/one-hippocampus")
)

def get_hippocampus_dir():
    d = os.path.abspath(DEFAULT_HIPPOCAMPUS_DIR)
    if not os.path.isdir(d):
        # 兜底 fallback
        alt = "/home/ctyun/onespace/github/one-hippocampus"
        if os.path.isdir(alt):
            return alt
    return d

def get_db_path(repo_dir):
    return os.path.join(repo_dir, ".fts.db")

def cjk_spaced(s):
    if not s:
        return ""
    # 在相邻 CJK 字符之间插入空格，使 SQLite FTS5 unicode61 逐字成 token 支持中文字词查询
    return re.sub(r'(?<=[\u3400-\u9fff])(?=[\u3400-\u9fff])', ' ', s)

def extract_title(text, path):
    m = re.search(r'^#\s+(.+)', text, re.M)
    if m:
        return m.group(1).strip()
    return os.path.splitext(os.path.basename(path))[0]

def init_db(con):
    con.execute('''
        CREATE VIRTUAL TABLE IF NOT EXISTS fts USING fts5(
            path,
            title,
            body,
            tokenize='unicode61'
        )
    ''')

def get_target_files(repo_dir):
    candidates = []
    for folder in ['memory', 'onewiki', 'system']:
        folder_path = os.path.join(repo_dir, folder)
        if os.path.isdir(folder_path):
            for root, _, files in os.walk(folder_path):
                for f in files:
                    if f.endswith('.md'):
                        candidates.append(os.path.join(root, f))
    for top_file in ['INDEX.md', 'hot.md', 'recent.md']:
        p = os.path.join(repo_dir, top_file)
        if os.path.isfile(p):
            candidates.append(p)
    return candidates

def index_file(con, full_path, rel_path):
    if not os.path.isfile(full_path):
        con.execute('DELETE FROM fts WHERE path = ?', (rel_path,))
        return False
    text = open(full_path, encoding='utf-8', errors='ignore').read()
    title = extract_title(text, full_path)
    con.execute('DELETE FROM fts WHERE path = ?', (rel_path,))
    con.execute('INSERT INTO fts(path, title, body) VALUES(?, ?, ?)',
                (rel_path, cjk_spaced(title), cjk_spaced(text)))
    return True

def cmd_rebuild():
    repo_dir = get_hippocampus_dir()
    db_path = get_db_path(repo_dir)
    con = sqlite3.connect(db_path)
    try:
        init_db(con)
        con.execute('DELETE FROM fts')
        files = get_target_files(repo_dir)
        count = 0
        for full in files:
            rel = os.path.relpath(full, repo_dir)
            if index_file(con, full, rel):
                count += 1
        con.commit()
        print(f">>> [Super-Me BM25] 海马体索引重建完成，共索引 {count} 篇文档 (DB: {db_path})")
    finally:
        con.close()

def cmd_sync(rel_path):
    repo_dir = get_hippocampus_dir()
    db_path = get_db_path(repo_dir)
    con = sqlite3.connect(db_path)
    try:
        init_db(con)
        full = os.path.join(repo_dir, rel_path)
        if not os.path.exists(full):
            con.execute('DELETE FROM fts WHERE path = ?', (rel_path,))
            con.commit()
            print(f">>> [Super-Me BM25] 文件已移除，清理索引条目: {rel_path}")
        else:
            index_file(con, full, rel_path)
            con.commit()
            print(f">>> [Super-Me BM25] 增量同步完成: {rel_path}")
    finally:
        con.close()

def run_query(con, match_expr):
    cur = con.execute('''
        SELECT path,
               snippet(fts, 1, '【', '】', '...', 10) as title_snip,
               snippet(fts, 2, '【', '】', '...', 25) as body_snip,
               bm25(fts) as score
        FROM fts
        WHERE fts MATCH ?
        ORDER BY bm25(fts)
        LIMIT 10
    ''', (match_expr,))
    return cur.fetchall()

def cmd_search(query):
    repo_dir = get_hippocampus_dir()
    db_path = get_db_path(repo_dir)
    if not os.path.isfile(db_path):
        print(">>> [Super-Me BM25] 索引库不存在，自动触发全量重建...")
        cmd_rebuild()

    q = query.strip()
    if not q:
        print(">>> 请输入检索关键词")
        return

    con = sqlite3.connect(db_path)
    try:
        init_db(con)
        phrases = []
        words = []
        for part in q.split():
            if re.search(r'[\u3400-\u9fff]', part):
                phrases.append('"' + ' '.join(list(part)) + '"')
                words.extend(list(part))
            else:
                phrases.append(f'"{part}"*')
                words.append(f'"{part}"*')

        # 策略 1: 完整短语匹配
        expr1 = ' AND '.join(phrases)
        try:
            rows = run_query(con, expr1)
        except Exception:
            rows = []

        # 策略 2: 词项 AND 匹配
        if not rows and len(words) > 1:
            expr2 = ' AND '.join([f'"{w}"' if re.search(r'[\u3400-\u9fff]', w) else w for w in words])
            try:
                rows = run_query(con, expr2)
            except Exception:
                rows = []

        # 策略 3: 词项 OR 匹配
        if not rows and len(words) > 1:
            expr3 = ' OR '.join([f'"{w}"' if re.search(r'[\u3400-\u9fff]', w) else w for w in words])
            try:
                rows = run_query(con, expr3)
            except Exception:
                rows = []

        if not rows:
            print(f">>> [Super-Me BM25] 未检索到包含 '{query}' 的相关文档")
            return

        print(f">>> [Super-Me BM25] 检索 '{query}' 命中结果（相关度排序）：\n")
        for idx, (path, t_snip, b_snip, score) in enumerate(rows, 1):
            clean_t = t_snip.replace(' ', '')
            clean_b = b_snip.replace(' ', '')
            print(f"[{idx}] {path} (BM25评分: {score:.3f})")
            print(f"    标题: {clean_t}")
            print(f"    摘要: {clean_b}\n")
    finally:
        con.close()

def cmd_clean_recent():
    repo_dir = get_hippocampus_dir()
    recent_file = os.path.join(repo_dir, "recent.md")
    if not os.path.isfile(recent_file):
        print(f">>> [Super-Me 治理] 文件不存在: {recent_file}")
        return

    content = open(recent_file, "r", encoding="utf-8").read()
    lines = content.splitlines()

    header_lines = []
    table_rows = []
    in_table = False

    for line in lines:
        if line.strip().startswith("|") and ("---" in line or "实体" in line):
            header_lines.append(line)
            in_table = True
        elif in_table and line.strip().startswith("|"):
            table_rows.append(line)
        elif not in_table:
            header_lines.append(line)

    now = datetime.now()
    cutoff_date = (now - timedelta(days=60)).strftime("%Y-%m-%d")

    valid_entries = []
    for row in table_rows:
        parts = [p.strip() for p in row.strip().split("|")[1:-1]]
        if len(parts) >= 3:
            entity, pointer, date_str = parts[0], parts[1], parts[2]
            m = re.search(r'\d{4}-\d{2}-\d{2}', date_str)
            if m:
                d_val = m.group(0)
                if d_val >= cutoff_date:
                    valid_entries.append((d_val, row))
                else:
                    print(f"  [-] 超期淘汰 (>60天): {entity} ({d_val})")
            else:
                valid_entries.append(("1970-01-01", row))

    valid_entries.sort(key=lambda x: x[0], reverse=True)

    if len(valid_entries) > 100:
        removed = valid_entries[100:]
        valid_entries = valid_entries[:100]
        for _, r in removed:
            print(f"  [-] 超量淘汰 (超出100条上限): {r}")

    new_rows = [r for _, r in valid_entries]
    new_content = "\n".join(header_lines) + "\n" + "\n".join(new_rows) + "\n"
    with open(recent_file, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f">>> [Super-Me 治理] 近期记忆清理完成，当前保留 {len(new_rows)} 条有效记忆。")

def print_help():
    print("""One Super-Me Client (客户端与引擎)

用法:
  python3 client.py search <关键词>       # BM25 检索海马体知识与避坑手册
  python3 client.py <关键词>              # 快捷搜索模式
  python3 client.py rebuild               # 全量重建海马体 .fts.db 索引
  python3 client.py sync <文件相对路径>    # 增量同步单篇文档索引
  python3 client.py clean                 # 治理近期记忆 (双阈值 60天/100条)
""")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print_help()
        sys.exit(0)

    arg = sys.argv[1]
    if arg in ["-h", "--help", "help"]:
        print_help()
    elif arg == "rebuild":
        cmd_rebuild()
    elif arg == "sync":
        if len(sys.argv) < 3:
            print(">>> 请指定待同步的文件相对路径")
            sys.exit(1)
        cmd_sync(sys.argv[2])
    elif arg in ["clean", "clean-recent"]:
        cmd_clean_recent()
    elif arg == "search":
        if len(sys.argv) < 3:
            print(">>> 请输入检索关键词")
            sys.exit(1)
        cmd_search(" ".join(sys.argv[2:]))
    else:
        # 默认作为关键词检索
        cmd_search(" ".join(sys.argv[1:]))
