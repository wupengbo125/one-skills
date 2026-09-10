#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/wiki.py - 个人 Wiki FTS5 全文检索与索引同步脚本 (参考 one-memory 架构)

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

def _expand_cjk(match):
    s = match.group(0)
    n = len(s)
    tokens = []
    for i in range(n):
        tokens.append(s[i])
        if i + 1 < n:
            tokens.append(s[i:i+2])
    return f" {' '.join(tokens)} "

def tokenize(text):
    if not text:
        return ""
    return re.sub(r'[\u4e00-\u9fff]+', _expand_cjk, text)

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
    conn.execute("""
        CREATE TABLE IF NOT EXISTS file_meta (
            path TEXT PRIMARY KEY,
            mtime REAL
        );
    """)
    conn.commit()
    return conn

def _index_file(conn, repo_dir, rel_path, full_path=None):
    if full_path is None:
        full_path = os.path.join(repo_dir, rel_path)
    try:
        mtime = os.path.getmtime(full_path)
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception:
        return False

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

    conn.execute("DELETE FROM docs_fts WHERE path = ?", (rel_path,))
    conn.execute(
        "INSERT INTO docs_fts(path, title, category, content) VALUES (?, ?, ?, ?)",
        (rel_path, tok_title, category, tok_content)
    )
    conn.execute(
        "INSERT OR REPLACE INTO file_meta(path, mtime) VALUES (?, ?)",
        (rel_path, mtime)
    )
    return True

def _remove_file(conn, rel_path):
    conn.execute("DELETE FROM docs_fts WHERE path = ?", (rel_path,))
    conn.execute("DELETE FROM file_meta WHERE path = ?", (rel_path,))

def ensure_synced(repo_dir, conn):
    target_dir = os.path.join(repo_dir, "onewiki")
    if not os.path.isdir(target_dir):
        target_dir = repo_dir

    cursor = conn.execute("SELECT path, mtime FROM file_meta")
    db_files = dict(cursor.fetchall())

    disk_files = {}
    for root, dirs, files in os.walk(target_dir):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for file in files:
            if file.endswith(".md"):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, repo_dir)
                try:
                    disk_files[rel_path] = (full_path, os.path.getmtime(full_path))
                except OSError:
                    pass

    changed = False
    for rel_path, (full_path, mtime) in disk_files.items():
        db_mtime = db_files.get(rel_path)
        if db_mtime is None or mtime > db_mtime:
            if _index_file(conn, repo_dir, rel_path, full_path):
                changed = True

    for rel_path in db_files:
        if rel_path not in disk_files:
            _remove_file(conn, rel_path)
            changed = True

    if changed:
        conn.commit()

def cmd_sync(rel_path):
    repo_dir = get_repo_dir()
    if rel_path.startswith("./"):
        rel_path = rel_path[2:]
    full_path = os.path.join(repo_dir, rel_path)

    conn = get_db_connection(repo_dir)
    if not os.path.isfile(full_path):
        _remove_file(conn, rel_path)
        conn.commit()
        conn.close()
        print(f"🗑️ 已从索引库移除已删除文档: {rel_path}")
        return

    if not _index_file(conn, repo_dir, rel_path, full_path):
        conn.close()
        print(f"❌ 读取文件失败: {rel_path}")
        return

    conn.commit()
    conn.close()
    print(f"✅ 已增量同步至索引: {rel_path} -> .fts.db")

def cmd_rebuild():
    repo_dir = get_repo_dir()
    db_path = get_db_path(repo_dir)
    for ext in ["", "-wal", "-shm"]:
        f = db_path + ext
        if os.path.exists(f):
            try:
                os.remove(f)
            except Exception:
                pass

    conn = get_db_connection(repo_dir)
    conn.execute("DELETE FROM docs_fts;")
    conn.execute("DELETE FROM file_meta;")

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
                if _index_file(conn, repo_dir, rel_path, full_path):
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

    conn = get_db_connection(repo_dir)
    ensure_synced(repo_dir, conn)

    raw_tokens = tokenize(query_str).split()
    tokens = [t.replace('"', '""') for t in raw_tokens if t.strip()]
    if not tokens:
        print(">>> 请输入有效的检索关键词")
        conn.close()
        return

    fts_query = " OR ".join([f'"{t}"' for t in tokens])

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
