#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/memory.py - 海马体记忆检索与索引同步工具 (极简版 ~200行)
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
    if custom and os.path.isdir(os.path.expanduser(custom)):
        return os.path.abspath(os.path.expanduser(custom))
    d = os.path.abspath(DEFAULT_HIPPOCAMPUS_DIR)
    return d

def get_db_path(repo_dir):
    return os.path.join(repo_dir, ".fts.db")

def resolve_rel_path(p, repo_dir):
    p = os.path.expanduser(p.strip())
    if os.path.isabs(p):
        return os.path.relpath(p, repo_dir) if p.startswith(repo_dir) else p
    target = os.path.normpath(os.path.join(repo_dir, p))
    if os.path.isfile(target):
        return os.path.relpath(target, repo_dir)
    abs_p = os.path.abspath(p)
    if abs_p.startswith(repo_dir):
        return os.path.relpath(abs_p, repo_dir)
    return os.path.normpath(p).lstrip(os.sep)

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
    conn = sqlite3.connect(get_db_path(repo_dir))
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("""
        CREATE VIRTUAL TABLE IF NOT EXISTS docs_fts USING fts5(
            path UNINDEXED,
            raw_title UNINDEXED,
            raw_content UNINDEXED,
            title,
            category,
            content,
            anchor,
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

def parse_entries(raw_content):
    """把 markdown 拆成条目列表 [(anchor, title, content), ...]。

    规则：`##`/`###` 开头为小节锚点；`- `/`* ` 列表项为一条记录
    （`- **名称**：内容` 用名称做 title）；其余段落按整体一条。
    每日流水等无结构的文件退化为整篇一条。
    """
    entries = []
    anchor = ""
    buf_title = None
    buf_lines = []

    def flush():
        nonlocal buf_title, buf_lines
        if buf_title is not None and buf_lines:
            text = "\n".join(buf_lines).strip()
            if text:
                entries.append((anchor, buf_title, text))
        buf_title = None
        buf_lines = []

    for line in raw_content.splitlines():
        s = line.strip()
        if s.startswith("# "):
            flush()
            anchor = ""
        elif s.startswith("## ") or s.startswith("### "):
            flush()
            anchor = re.sub(r'^#+\s*', '', s)
        elif s.startswith("- ") or s.startswith("* "):
            flush()
            item = s[2:].strip()
            m = re.match(r'^\*\*(.+?)\*\*[：:]\s*(.*)$', item)
            if m:
                buf_title = m.group(1).strip()
                buf_lines = [m.group(2).strip()] if m.group(2) else [item]
            else:
                buf_title = item
                buf_lines = [item]
        elif s == "":
            flush()
        else:
            if buf_title is None:
                buf_title = s
                buf_lines = [s]
            else:
                buf_lines.append(s)
    flush()
    if not entries and raw_content.strip():
        entries.append(("", extract_title(raw_content, ""), raw_content.strip()))
    return entries

def insert_entries(conn, rel_path, raw_title, category, raw_content):
    conn.execute("DELETE FROM docs_fts WHERE path = ?", (rel_path,))
    entries = parse_entries(raw_content)
    for anchor, title, content in entries:
        conn.execute(
            "INSERT INTO docs_fts(path, raw_title, raw_content, title, category, content, anchor) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (rel_path, raw_title, content, tokenize(title), category, tokenize(content), anchor)
        )
    return len(entries)

def make_clean_snippet(raw_text, words):
    clean = re.sub(r'\s+', ' ', raw_text).strip()
    for w in sorted(words, key=len, reverse=True):
        idx = clean.lower().find(w.lower())
        if idx != -1:
            start, end = max(0, idx - 30), min(len(clean), idx + 90)
            snip = ('...' if start > 0 else '') + clean[start:end] + ('...' if end < len(clean) else '')
            pattern = re.compile('|'.join(re.escape(k) for k in words if k), re.IGNORECASE)
            return pattern.sub(r'【\g<0>】', snip)
    return clean[:120] + ('...' if len(clean) > 120 else '')

def cmd_sync(target_path):
    repo_dir = get_hippocampus_dir()
    rel_path = resolve_rel_path(target_path, repo_dir)
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
            raw_content = f.read()
    except Exception as e:
        print(f"❌ 读取文件失败: {e}")
        conn.close()
        return

    raw_title = extract_title(raw_content, os.path.basename(rel_path))
    parts = rel_path.split(os.sep)
    category = parts[0] if len(parts) > 1 else "root"

    n = insert_entries(conn, rel_path, raw_title, category, raw_content)
    conn.commit()
    conn.close()
    print(f"✅ 已增量同步至索引: {rel_path} ({n} 条)")

def cmd_rebuild():
    repo_dir = get_hippocampus_dir()
    db_path = get_db_path(repo_dir)
    for ext in ["", "-wal", "-shm"]:
        f = db_path + ext
        if os.path.exists(f):
            try:
                os.remove(f)
            except Exception:
                pass

    conn = get_db_connection(repo_dir)
    count = 0
    valid_dirs = {"memory", "system"}
    for root, dirs, files in os.walk(repo_dir):
        dirs[:] = [d for d in dirs if not d.startswith(".") and (root != repo_dir or d in valid_dirs)]
        for file in files:
            if file.endswith(".md"):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, repo_dir)
                try:
                    with open(full_path, "r", encoding="utf-8") as f:
                        raw_content = f.read()
                except Exception:
                    continue

                raw_title = extract_title(raw_content, file)
                parts = rel_path.split(os.sep)
                category = parts[0] if len(parts) > 1 else "root"

                n = insert_entries(conn, rel_path, raw_title, category, raw_content)
                count += n

    conn.commit()
    conn.close()
    print(f"🎉 索引重建完成，已索引 {count} 篇海马体文档 -> {db_path}")

def cmd_search(query_str):
    repo_dir = get_hippocampus_dir()
    db_path = get_db_path(repo_dir)
    if not os.path.isfile(db_path):
        cmd_rebuild()

    segments = re.findall(r'[\u4e00-\u9fff]+|[a-zA-Z0-9_\-]+', query_str)
    clauses, words = [], []
    for seg in segments:
        words.append(seg)
        if '\u4e00' <= seg[0] <= '\u9fff':
            if len(seg) == 1:
                clauses.append(f'"{seg}"')
            else:
                bigrams = [seg[i:i+2] for i in range(len(seg)-1)]
                words.extend(bigrams)
                clauses.append(" OR ".join(f'"{bg}"' for bg in bigrams))
        else:
            w = seg.lower()
            clauses.append(f'"{w}"')
    
    fts_query = " AND ".join(f"({c})" if " OR " in c else c for c in clauses) if clauses else ""
    if not fts_query:
        print(">>> 请输入有效的检索关键词")
        return

    conn = get_db_connection(repo_dir)
    sql = """
        SELECT path, raw_title, category, raw_content, anchor,
               bm25(docs_fts, 0.0, 0.0, 0.0, 5.0, 1.0, 2.0, 3.0) as rank
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

    valid_words = sorted(list(dict.fromkeys(words)), key=len, reverse=True)
    pattern = re.compile('|'.join(re.escape(k) for k in valid_words if k), re.IGNORECASE) if valid_words else None

    print(f"⚡ [BM25 检索命中 {len(rows)} 条] 关键词: {query_str}")
    for idx, row in enumerate(rows, 1):
        rel_path, raw_title, category, raw_content, anchor, score = row
        snip = make_clean_snippet(raw_content, valid_words)
        loc = f"{rel_path} › {anchor}" if anchor else rel_path
        print(f"\n{idx}. 📄 {loc} (类别: {category})")
        print(f"   摘要: {snip}")

def main():
    if len(sys.argv) < 2:
        print("用法: python3 scripts/memory.py [search <关键词> | sync <路径> | rebuild | <关键词>]")
        sys.exit(0)

    cmd = sys.argv[1]
    if cmd in ["-h", "--help", "help"]:
        print("用法: python3 scripts/memory.py [search <关键词> | sync <路径> | rebuild | <关键词>]")
    elif cmd == "rebuild":
        cmd_rebuild()
    elif cmd == "sync":
        if len(sys.argv) < 3:
            print(">>> 请指定待同步路径，如: python3 scripts/memory.py sync 'memory/2026-09/xxx.md'")
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
