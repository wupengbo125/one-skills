#!/usr/bin/env python3
"""
ghfile - GitHub 远端仓库文件操作 CLI（Agent 标准原语：list/read/write/delete + edit/append）
底层全部走 gh api（gh 已登录，自动认证），不依赖 MCP、不写本地文件。

用法:
  ghfile list <repo> [path] [--branch b]          # 列目录
  ghfile read <repo> <path> [--branch b]          # 读文件
  ghfile write <repo> <path> <content> [msg] [--branch b]   # 写/覆盖（自动带 sha）
  ghfile delete <repo> <path> [msg] [--branch b]  # 删文件
  ghfile edit <repo> <path> <old> <new> [msg] [--branch b]  # 局部替换/插入（old 唯一才成功）
  ghfile append <repo> <path> <content> [msg] [--branch b]  # 末尾追加
"""
import argparse, base64, subprocess, sys, json, os, urllib.request, urllib.parse

TOKEN = os.environ.get("GITHUB_TOKEN", "")

def _gh(*args, allow_404=False):
    """优先 gh cli；gh 未认证且存在 GITHUB_TOKEN 时回退 REST API。"""
    r = subprocess.run(["gh"] + list(args), capture_output=True, text=True)
    if r.returncode == 0:
        return r.stdout
    if "To authenticate" in (r.stderr or "") and TOKEN:
        return _api_fallback(args, None)
    if allow_404 and "Not Found" in (r.stderr or ""):
        return ""
    sys.stderr.write(r.stderr or r.stdout)
    sys.exit(r.returncode)

def _api_fallback(args, data):
    """把 gh api 参数翻译成直接 REST 调用（仅支持本脚本用到的子集）。"""
    method = "GET"
    url = None
    headers = {"Authorization": f"token {TOKEN}", "Accept": "application/vnd.github+json"}
    body = None
    i = 0
    fields = {}
    while i < len(args):
        a = args[i]
        if a == "--method":
            method = args[i+1]; i += 2; continue
        if a == "-f":
            k, v = args[i+1].split("=", 1); fields[k] = v; i += 2; continue
        if a == "-X":
            method = args[i+1]; i += 2; continue
        if a == "-H":
            i += 2; continue
        if a == "-d":
            body = args[i+1].encode(); i += 2; continue
        if url is None and not a.startswith("-"):
            url = a; i += 1; continue
        i += 1
    if url is None:
        sys.exit("ghfile: 无法解析 gh api 参数")
    api_url = "https://api.github.com/" + url
    if method == "GET":
        req = urllib.request.Request(api_url, headers=headers)
    else:
        if body is None and fields:
            body = json.dumps(fields).encode()
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(api_url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.read().decode()
    except urllib.error.HTTPError as e:
        sys.stderr.write(f"HTTP {e.code}: {e.read().decode()[:300]}\n")
        sys.exit(1)

def get_sha(repo, path, branch):
    """返回远端文件 sha；不存在返回 None"""
    out = _gh("api", f"repos/{repo}/contents/{path}?ref={branch}", allow_404=True)
    if not out:
        return None
    try:
        return json.loads(out).get("sha")
    except Exception:
        return None

def read_file(repo, path, branch):
    out = _gh("api", f"repos/{repo}/contents/{path}?ref={branch}")
    data = json.loads(out)
    return base64.b64decode(data["content"]).decode("utf-8")

def put_file(repo, path, content, msg, branch, sha=None):
    payload = {
        "message": msg,
        "content": base64.b64encode(content.encode()).decode(),
        "branch": branch,
    }
    if sha:
        payload["sha"] = sha
    args = ["api", "--method", "PUT", f"repos/{repo}/contents/{path}",
            "-f", f"message={msg}", "-f", f"content={payload['content']}",
            "-f", f"branch={branch}"]
    if sha:
        args += ["-f", f"sha={sha}"]
    out = _gh(*args)
    print(f"✓ {path} ({msg})")
    return out

def delete_file(repo, path, msg, branch):
    sha = get_sha(repo, path, branch)
    if not sha:
        sys.stderr.write(f"✗ {path} 不存在\n"); sys.exit(1)
    _gh("api", "--method", "DELETE", f"repos/{repo}/contents/{path}",
        "-f", f"message={msg}", "-f", f"sha={sha}", "-f", f"branch={branch}")
    print(f"✓ 已删除 {path}")

def cmd_ls(args):
    path = args.path or ""
    out = _gh("api", f"repos/{args.repo}/contents/{path}?ref={args.branch}")
    for item in json.loads(out):
        t = "📁" if item["type"] == "dir" else "📄"
        print(f"{t} {item['name']}")

def cmd_cat(args):
    print(read_file(args.repo, args.path, args.branch), end="")

def cmd_write(args):
    sha = get_sha(args.repo, args.path, args.branch)
    put_file(args.repo, args.path, args.content, args.msg, args.branch, sha)

def cmd_rm(args):
    delete_file(args.repo, args.path, args.msg, args.branch)

def cmd_edit(args):
    content = read_file(args.repo, args.path, args.branch)
    n = content.count(args.old)
    if n == 0:
        sys.stderr.write(f"✗ old 文本在文件中不存在，未改动\n"); sys.exit(1)
    if n > 1:
        sys.stderr.write(f"✗ old 文本匹配 {n} 处，不唯一，未改动；请加更多上下文\n"); sys.exit(1)
    new_content = content.replace(args.old, args.new)
    put_file(args.repo, args.path, new_content, args.msg, args.branch,
             get_sha(args.repo, args.path, args.branch))
    print("✓ 已替换 1 处")

def cmd_append(args):
    content = read_file(args.repo, args.path, args.branch)
    new_content = content.rstrip("\n") + "\n" + args.content.rstrip("\n") + "\n"
    put_file(args.repo, args.path, new_content, args.msg, args.branch,
             get_sha(args.repo, args.path, args.branch))

def main():
    p = argparse.ArgumentParser(prog="ghfile")
    sub = p.add_subparsers(dest="cmd", required=True)

    def add_common(sp, with_path=True):
        sp.add_argument("repo")
        if with_path:
            sp.add_argument("path")
        sp.add_argument("--branch", default="main")

    # Agent 标准命名：list/read/write/delete/edit/append
    sp = sub.add_parser("list"); add_common(sp, False); sp.add_argument("path", nargs="?", default=""); sp.set_defaults(fn=cmd_ls)
    sp = sub.add_parser("read"); add_common(sp); sp.set_defaults(fn=cmd_cat)
    sp = sub.add_parser("write"); add_common(sp); sp.add_argument("content"); sp.add_argument("msg", nargs="?", default="feat: update file"); sp.set_defaults(fn=cmd_write)
    sp = sub.add_parser("delete"); add_common(sp); sp.add_argument("msg", nargs="?", default="chore: remove file"); sp.set_defaults(fn=cmd_rm)
    sp = sub.add_parser("edit"); add_common(sp); sp.add_argument("old"); sp.add_argument("new"); sp.add_argument("msg", nargs="?", default="feat: edit file"); sp.set_defaults(fn=cmd_edit)
    sp = sub.add_parser("append"); add_common(sp); sp.add_argument("content"); sp.add_argument("msg", nargs="?", default="feat: append file"); sp.set_defaults(fn=cmd_append)

    args = p.parse_args()
    args.fn(args)

if __name__ == "__main__":
    main()
