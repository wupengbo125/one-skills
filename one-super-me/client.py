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
import json
import sqlite3
import urllib.request
import urllib.error
from datetime import datetime, timedelta

DEFAULT_HIPPOCAMPUS_DIR = os.path.expanduser(
    os.environ.get("ONE_HIPPOCAMPUS_DIR", "~/onespace/github/one-hippocampus")
)

def load_config():
    """加载 ~/.config/one-super-me/config.env 中的配置，已有环境变量优先"""
    cfg_file = os.path.expanduser("~/.config/one-super-me/config.env")
    if os.path.isfile(cfg_file):
        try:
            with open(cfg_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'\"")
                    if k and k not in os.environ:
                        os.environ[k] = v
        except Exception:
            pass

def get_llm_config():
    load_config()
    base_url = os.environ.get("OPENAI_BASE_URL") or os.environ.get("AI_API")
    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("AI_API_KEY") or "EMPTY"
    model = os.environ.get("OPENAI_MODEL") or os.environ.get("AI_MODEL") or "one-luna"
    return base_url, api_key, model

def get_hippocampus_dir():
    load_config()
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
def cmd_ingest(input_text=None, file_path=None):
    text = ""
    if input_text:
        text = input_text
    elif file_path and os.path.isfile(file_path):
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
    elif not sys.stdin.isatty():
        text = sys.stdin.read()

    text = text.strip()
    if not text:
        print(">>> [Super-Me Ingest] 输入内容为空，跳过提炼。")
        return

    base_url, api_key, model = get_llm_config()
    if not base_url:
        print(">>> [Super-Me Ingest] 未配置大模型端点 (可在 ~/.config/one-super-me/config.env 中配置 OPENAI_BASE_URL 与 OPENAI_API_KEY)，跳过自动提炼。")
        return

    repo_dir = get_hippocampus_dir()
    if not os.path.isdir(repo_dir):
        print(f">>> [Super-Me Ingest] 海马体数据仓不存在: {repo_dir}")
        return

    endpoint = base_url.rstrip("/") + "/chat/completions"
    prompt = (
        "你是一个严谨的工程知识与环境认知提炼助手。请分析提供的会话文本或日志，判断是否有值得永久沉淀的：\n"
        "1. 操作方法 (How-to, category=\"methods\")：如服务部署、代理切换、排障操作命令；\n"
        "2. 资源定位 (Where-is, category=\"locations\")：如局域网机器拓扑、服务端口、仓库工程路径；\n"
        "3. 关键事实 (What-is, category=\"facts\")：如用户硬件配置、特定约束规则、环境配置事实。\n\n"
        "【规则】\n"
        "- 若只是日常闲聊、临时查询或无新增固定经验，必须严格只回复: NO_INCREMENT\n"
        "- 若有价值，严格只输出合法单行 JSON 对象（无 markdown 包裹，无解释）：\n"
        '{"category": "methods"|"locations"|"facts", "topic": "中文主题名称(如: 本地服务部署与重启)", "content": "要追加的Markdown要点内容"}'
    )

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": prompt},
            {"role": "user", "content": text[-10000:]}
        ],
        "temperature": 0.1
    }

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            endpoint,
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            }
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp_body = resp.read().decode("utf-8")
            res_json = json.loads(resp_body)
            content_text = res_json["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f">>> [Super-Me Ingest] 大模型请求失败 ({e})，跳过提炼。")
        return

    if "NO_INCREMENT" in content_text or not content_text:
        print(">>> [Super-Me Ingest] 经分析无认知增量，保持静默。")
        return

    content_text = re.sub(r"^```json\s*", "", content_text, flags=re.I)
    content_text = re.sub(r"\s*```$", "", content_text)

    try:
        parsed = json.loads(content_text)
    except Exception:
        m = re.search(r"\{.*\}", content_text, re.S)
        if m:
            try:
                parsed = json.loads(m.group(0))
            except Exception:
                print(">>> [Super-Me Ingest] 模型输出无法解析为 JSON，跳过。")
                return
        else:
            print(">>> [Super-Me Ingest] 未发现有效 JSON 增量，跳过。")
            return

    category = parsed.get("category", "").strip().lower()
    topic = parsed.get("topic", "").strip()
    content_to_add = parsed.get("content", "").strip()

    if category not in ["methods", "locations", "facts"] or not topic or not content_to_add:
        print(">>> [Super-Me Ingest] 结构化字段不合规，跳过写入。")
        return

    topic = re.sub(r'[/\\:\*?"<>|]', '_', topic).replace(".md", "")
    target_dir = os.path.join(repo_dir, "memory", category)
    os.makedirs(target_dir, exist_ok=True)
    target_file = os.path.join(target_dir, f"{topic}.md")
    rel_path = os.path.relpath(target_file, repo_dir)

    is_new = not os.path.isfile(target_file)
    with open(target_file, "a", encoding="utf-8") as f:
        if is_new:
            f.write(f"# {topic}\n\n{content_to_add}\n")
        else:
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
            f.write(f"\n\n## 增量记录 ({now_str})\n\n{content_to_add}\n")

    print(f">>> [Super-Me Ingest] 认知沉淀入库: {rel_path}")
    # 顺便写入本地 BM25 数据库
    cmd_sync(rel_path)

def print_help():
    print("""One Super-Me Client (客户端与引擎)

用法:
  python3 client.py search <关键词>         # BM25 检索海马体知识与避坑手册
  python3 client.py <关键词>                # 快捷搜索模式
  python3 client.py ingest [--text "内容"]  # 数据摄入：模型分析提取增量并顺便写库
  python3 client.py sync <文件相对路径>      # 增量同步单篇文档索引到 .fts.db
  python3 client.py rebuild                 # 全量重建海马体 .fts.db 索引
  python3 client.py clean                   # 治理近期记忆 (双阈值 60天/100条)
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
    elif arg == "ingest":
        input_text = None
        file_path = None
        if len(sys.argv) >= 3:
            if sys.argv[2] in ["--text", "-t"] and len(sys.argv) >= 4:
                input_text = " ".join(sys.argv[3:])
            elif sys.argv[2] in ["--file", "-f"] and len(sys.argv) >= 4:
                file_path = sys.argv[3]
            else:
                input_text = " ".join(sys.argv[2:])
        cmd_ingest(input_text=input_text, file_path=file_path)
    elif arg == "search":
        if len(sys.argv) < 3:
            print(">>> 请输入检索关键词")
            sys.exit(1)
        cmd_search(" ".join(sys.argv[2:]))
    else:
        cmd_search(" ".join(sys.argv[1:]))
