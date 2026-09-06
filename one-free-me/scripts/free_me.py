#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/free_me.py - 海马体记忆检索与索引同步工具
功能：
1. BM25 全文检索 (search)：秒级检索海马体文档，按相关度排序高亮输出
2. 增量索引同步 (sync)：单篇文档入库或清理
3. 全量重建索引 (rebuild)：全量扫描海马体重构 .fts.db
"""

import os
import sys
import re
import sqlite3

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
            tokens.append(text[start:i].lower())
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

def extract_title(content, default_name):
    for line in content.splitlines():
        line_s = line.strip()
        if line_s.startswith("# "):
            return line_s[2:].strip()
    return default_name

def cmd_sync(rel_path):
    repo_dir = get_hippocampus_dir()
    full_path = os.path.join(repo_dir, rel_path)

    conn = get_db_connection(repo_dir)
    if not os.path.isfile(full_path):
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
        conn.close()
        return

    title = extract_title(content, os.path.basename(rel_path))
    parts = rel_path.split(os.sep)
    category = parts[0] if len(parts) > 1 else "root"

    tok_title = tokenize(title)
    tok_content = tokenize(content)

    conn.execute("DELETE FROM docs_fts WHERE path = ?", (rel_path,))
    conn.execute(
        "INSERT INTO docs_fts(path, title, category, content) VALUES (?, ?, ?, ?)",
        (rel_path, tok_title, category, tok_content)
    )
    conn.commit()
    conn.close()
    print(f"✅ 已增量同步至索引: {rel_path}")

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

                title = extract_title(content, file)
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
    print(f"🎉 索引重建完成，已索引 {count} 篇海马体文档 -> {db_path}")

def cmd_search(query_str):
    repo_dir = get_hippocampus_dir()
    db_path = get_db_path(repo_dir)
    if not os.path.isfile(db_path):
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
        print(f"🔍 未检索到关于 \"{query_str}\" 的内容。")
        return

    print(f"⚡ [BM25 检索命中 {len(rows)} 条] 关键词: {query_str}")
    for idx, row in enumerate(rows, 1):
        rel_path, hl_title, category, snip, score = row
        clean_snip = re.sub(r'[\r\n]+', ' ', snip).strip()
        print(f"\n{idx}. 📄 {rel_path} (类别: {category}) [评分: {score:.2f}]")
        print(f"   摘要: {clean_snip}")

def main():
    if len(sys.argv) < 2:
        print("用法: python3 scripts/free_me.py [search <关键词> | sync <路径> | rebuild | <关键词>]")
        sys.exit(0)

    cmd = sys.argv[1]
    if cmd in ["-h", "--help", "help"]:
        print("用法: python3 scripts/free_me.py [search <关键词> | sync <路径> | rebuild | <关键词>]")
    elif cmd == "rebuild":
        cmd_rebuild()
    elif cmd == "sync":
        if len(sys.argv) < 3:
            print(">>> 请指定待同步路径，如: python3 scripts/free_me.py sync 'memory/2026-09/xxx.md'")
            sys.exit(1)
        cmd_sync(sys.argv[2])
    elif cmd == "search":
        if len(sys.argv) < 3:
            print(">>> 请输入检索关键词")
            sys.exit(1)
        cmd_search(" ".join(sys.argv[2:]))
    else:
        cmd_search(" ".join(sys.argv[1:]))

if __name__ == "__main__":
    main()
