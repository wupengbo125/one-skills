#!/usr/bin/env python3
"""
one-orca-race: Orca 多 Agent 并行赛马调度脚本
将同一个 GitHub Issue / 提示词同时分发给多个 Agent（支持指定模型、隔离 worktree 并发执行）
"""

import argparse
import json
import os
import re
import subprocess
import sys
from typing import Dict, List, Optional, Tuple


def run_cmd(cmd: List[str], check: bool = True, capture: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
        text=True,
        check=check,
    )


def fetch_github_issue(issue_ref: str, repo: Optional[str] = None) -> Tuple[str, str, Optional[str]]:
    """
    通过 gh issue view 获取 Issue 的标题、正文与 issue number。
    issue_ref 可以是纯数字（如 12）或完整 URL / <owner>/<repo>#12。
    """
    cmd = ["gh", "issue", "view", issue_ref, "--json", "number,title,body,url"]
    if repo:
        cmd.extend(["--repo", repo])
    
    res = run_cmd(cmd, check=False)
    if res.returncode != 0:
        sys.stderr.write(f"❌ 获取 GitHub Issue 失败: {res.stderr}\n")
        sys.exit(1)
    
    data = json.loads(res.stdout)
    title = data.get("title", "")
    body = data.get("body", "")
    number = str(data.get("number", ""))
    return number, title, body


def parse_agent_spec(spec: str) -> Dict[str, str]:
    """
    解析单个 Agent 声明：
    格式:
      agent
      agent:model
      agent:model:effort
    例如:
      omp
      codex:gpt-5.4
      codebuddy
      claude:claude-3-7-sonnet:high
    """
    parts = spec.strip().split(":")
    agent_id = parts[0].strip().lower()
    model = parts[1].strip() if len(parts) > 1 and parts[1].strip() else None
    effort = parts[2].strip() if len(parts) > 2 and parts[2].strip() else None

    # 标准化名字映射
    alias_map = {
        "cbc": "codebuddy",
        "codebuddy-code": "codebuddy",
        "code-buddy": "codebuddy",
        "agy": "antigravity",
    }
    agent_id = alias_map.get(agent_id, agent_id)

    return {
        "raw": spec,
        "agent": agent_id,
        "model": model,
        "effort": effort,
    }


def resolve_repo_path(given_repo: Optional[str]) -> str:
    """确认目标 git 仓库路径"""
    if given_repo:
        if os.path.isdir(given_repo):
            return os.path.abspath(given_repo)
        # 可能是 owner/repo，尝试检查当前目录
        res = run_cmd(["git", "rev-parse", "--show-toplevel"], check=False)
        if res.returncode == 0:
            return res.stdout.strip()
    res = run_cmd(["git", "rev-parse", "--show-toplevel"], check=False)
    if res.returncode == 0:
        return res.stdout.strip()
    return os.path.abspath(".")


def build_full_prompt(prompt: Optional[str], issue_num: Optional[str], issue_title: Optional[str], issue_body: Optional[str]) -> str:
    parts = []
    if issue_title or issue_body:
        parts.append(f"# Target Task: GitHub Issue #{issue_num or ''} - {issue_title or ''}")
        if issue_body:
            parts.append(f"## Issue Description:\n{issue_body.strip()}")
    if prompt:
        parts.append(f"## User Instructions:\n{prompt.strip()}")
    
    parts.append("\n## Race Rules:\n- Solve the issue cleanly and completely.\n- Do not touch unrelated files.\n- Verify all changes before reporting.")
    return "\n\n".join(parts)


def is_orca_native_agent(agent_id: str) -> bool:
    """Orca 官方直接支持启动的 TUI agent"""
    native_agents = {
        "claude", "claude-agent-teams", "openclaude", "codex", "autohand",
        "ante", "trae", "opencode", "mimo-code", "pi", "omp", "prime-agent",
        "gemini", "antigravity", "aider", "goose", "amp", "kilo", "kiro",
        "crush", "aug", "cline", "codebuff", "command-code", "continue",
        "cursor", "droid", "kimi", "mistral-vibe", "qwen-code", "rovo",
        "hermes", "openclaw", "copilot", "grok", "devin"
    }
    return agent_id in native_agents


def launch_worker(
    worker_idx: int,
    agent_info: Dict[str, str],
    repo_path: str,
    base_branch: str,
    full_prompt: str,
    race_id: str,
    issue_num: Optional[str],
    dry_run: bool = False,
) -> Dict[str, any]:
    """
    为单个 Worker 创建独立的 Worktree 并启动 Agent 会话
    """
    agent = agent_info["agent"]
    model = agent_info["model"]
    effort = agent_info["effort"]

    # 规范化分支及 worktree 目录名
    safe_agent_name = re.sub(r"[^a-zA-Z0-9_-]", "_", agent_info["raw"])
    branch_name = f"race-{race_id}-{worker_idx + 1}-{safe_agent_name}"
    display_title = f"🏁 Race #{worker_idx + 1}: {agent_info['raw']}"

    print(f"\n🚀 [Worker {worker_idx + 1}] 正在初始化: {display_title}")
    print(f"   分支名: {branch_name}")

    if dry_run:
        print(f"   [DRY-RUN] 创建 worktree: {branch_name}")
        print(f"   [DRY-RUN] 启动 Agent: {agent} (model={model}, effort={effort})")
        return {"ok": True, "worker": worker_idx + 1, "agent": agent_info["raw"], "branch": branch_name}

    # 1. 优先使用 orca worktree create 创建独立分支和目录
    wt_cmd = [
        "orca", "worktree", "create",
        "--name", branch_name,
        "--repo", f"path:{repo_path}",
        "--base-branch", base_branch,
        "--comment", f"Orca race worker {worker_idx + 1} for {agent_info['raw']}",
        "--json"
    ]
    if issue_num and issue_num.isdigit():
        wt_cmd.extend(["--issue", issue_num])

    # 如果是 Orca 原生 agent 且无需额外 command 包裹，可直接带入 agent 参数
    # 注意：codebuddy 等非原生 agent 则走 worktree create + terminal create
    if is_orca_native_agent(agent) and not model:
        wt_cmd.extend(["--agent", agent, "--prompt", full_prompt])
        res = run_cmd(wt_cmd, check=False)
        if res.returncode == 0:
            print(f"   ✅ 原生 Agent 工作区创建并启动成功: {agent}")
            return {"ok": True, "worker": worker_idx + 1, "agent": agent_info["raw"], "branch": branch_name}
        else:
            sys.stderr.write(f"   ⚠️ orca worktree create 带 agent 失败，尝试解耦创建: {res.stderr}\n")

    # 2. 解耦创建：先建 worktree，再在 worktree 内建 terminal
    res = run_cmd(wt_cmd, check=False)
    if res.returncode != 0:
        # 如果已经存在或者创建报错，尝试获取现存或直接 fallback
        sys.stderr.write(f"   ⚠️ 创建 worktree 失败: {res.stderr.strip()}\n")
        return {"ok": False, "worker": worker_idx + 1, "agent": agent_info["raw"], "error": res.stderr}

    try:
        wt_data = json.loads(res.stdout)
        # 获取新创建 worktree 的 path 或 selector
        wt_selector = f"branch:{branch_name}"
    except Exception:
        wt_selector = f"branch:{branch_name}"

    # 3. 构造启动命令与终端启动
    if agent == "codebuddy":
        # 腾讯 CodeBuddy
        # 支持: codebuddy --prefill <prompt> 或 交互启动后 send
        # 先启动 codebuddy terminal
        term_cmd = [
            "orca", "terminal", "create",
            "--worktree", wt_selector,
            "--title", display_title,
            "--command", "codebuddy",
            "--json"
        ]
        term_res = run_cmd(term_cmd, check=False)
        if term_res.returncode == 0:
            try:
                term_data = json.loads(term_res.stdout)
                term_handle = term_data.get("result", {}).get("handle")
                if term_handle:
                    # 延时 2 秒注入 prompt
                    subprocess.Popen([
                        "bash", "-c",
                        f"sleep 2 && orca terminal send --terminal {term_handle} --text {json.dumps(full_prompt)} --enter"
                    ])
            except Exception:
                pass
            print(f"   ✅ 腾讯 CodeBuddy 终端启动成功")
            return {"ok": True, "worker": worker_idx + 1, "agent": agent_info["raw"], "branch": branch_name}
        else:
            sys.stderr.write(f"   ❌ 创建 CodeBuddy 终端失败: {term_res.stderr}\n")
            return {"ok": False, "worker": worker_idx + 1, "agent": agent_info["raw"], "error": term_res.stderr}

    elif is_orca_native_agent(agent):
        # 原生 agent 但带 model/effort 或带特殊参数
        cmd_str = agent
        if model:
            if agent in ("codex", "claude"):
                cmd_str += f" --model {model}"
            elif agent == "omp":
                cmd_str += f" --model {model}"
        
        term_cmd = [
            "orca", "terminal", "create",
            "--worktree", wt_selector,
            "--title", display_title,
            "--command", cmd_str,
            "--json"
        ]
        term_res = run_cmd(term_cmd, check=False)
        if term_res.returncode == 0:
            try:
                term_data = json.loads(term_res.stdout)
                term_handle = term_data.get("result", {}).get("handle")
                if term_handle:
                    subprocess.Popen([
                        "bash", "-c",
                        f"sleep 2 && orca terminal send --terminal {term_handle} --text {json.dumps(full_prompt)} --enter"
                    ])
            except Exception:
                pass
            print(f"   ✅ 原生 Agent ({agent}) 终端启动成功")
            return {"ok": True, "worker": worker_idx + 1, "agent": agent_info["raw"], "branch": branch_name}
        else:
            sys.stderr.write(f"   ❌ 创建终端失败: {term_res.stderr}\n")
            return {"ok": False, "worker": worker_idx + 1, "agent": agent_info["raw"], "error": term_res.stderr}
    else:
        # 自定义命令
        term_cmd = [
            "orca", "terminal", "create",
            "--worktree", wt_selector,
            "--title", display_title,
            "--command", agent,
            "--json"
        ]
        term_res = run_cmd(term_cmd, check=False)
        if term_res.returncode == 0:
            print(f"   ✅ 自定义命令 ({agent}) 终端启动成功")
            return {"ok": True, "worker": worker_idx + 1, "agent": agent_info["raw"], "branch": branch_name}
        else:
            sys.stderr.write(f"   ❌ 启动自定义命令终端失败: {term_res.stderr}\n")
            return {"ok": False, "worker": worker_idx + 1, "agent": agent_info["raw"], "error": term_res.stderr}


def main():
    parser = argparse.ArgumentParser(
        description="one-orca-race: Orca 并行赛马调度器 (同时发给多个 Agent，各配模型，独立 Worktree 跑)"
    )
    parser.add_argument(
        "--agents", "-a",
        nargs="+",
        required=True,
        help="参赛 Agent 列表，支持 agent[:model[:effort]]，如: -a codex:gpt-5.4 omp claude:claude-3-7-sonnet codebuddy"
    )
    parser.add_argument(
        "--issue", "-i",
        help="GitHub Issue 编号或 URL（如 123 或 owner/repo#123），自动通过 gh issue view 抓取并组装提示词"
    )
    parser.add_argument(
        "--prompt", "-p",
        help="追加/独立的自定义提示词"
    )
    parser.add_argument(
        "--repo", "-r",
        help="目标 Git 仓库路径或 selector (默认当前目录仓库)"
    )
    parser.add_argument(
        "--base-branch", "-b",
        default="main",
        help="切出赛马分支的基线分支 (默认: main)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="空跑模式，只打印解析结果与调度流程，不实际创建分支与终端"
    )

    args = parser.parse_args()

    if not args.issue and not args.prompt:
        sys.stderr.write("❌ 必须提供 --issue 或 --prompt 之一作为赛马任务输入！\n")
        sys.exit(1)

    # 1. 确认 repo
    repo_path = resolve_repo_path(args.repo)
    print(f"📦 目标仓库: {repo_path}")

    # 2. 抓取 Issue（如果有）
    issue_num = None
    issue_title = None
    issue_body = None
    if args.issue:
        print(f"🔍 正在抓取 GitHub Issue: {args.issue} ...")
        issue_num, issue_title, issue_body = fetch_github_issue(args.issue, repo=None)
        print(f"   已获取: #{issue_num} {issue_title}")

    # 3. 组装全量 Prompt
    full_prompt = build_full_prompt(args.prompt, issue_num, issue_title, issue_body)

    # 4. 解析 Agent 列表
    parsed_agents = [parse_agent_spec(a) for a in args.agents]
    print(f"🏁 参赛 Agent 规模: {len(parsed_agents)} 位")
    for idx, ag in enumerate(parsed_agents):
        print(f"   [{idx + 1}] Agent: {ag['agent']} | Model: {ag['model'] or '(默认)'} | Effort: {ag['effort'] or '(默认)'}")

    # 5. 生成本次赛马批次 ID
    import time
    race_id = str(int(time.time()))[-4:]

    # 6. 并发/逐个分发独立 Worktree
    results = []
    for idx, ag in enumerate(parsed_agents):
        res = launch_worker(
            worker_idx=idx,
            agent_info=ag,
            repo_path=repo_path,
            base_branch=args.base_branch,
            full_prompt=full_prompt,
            race_id=race_id,
            issue_num=issue_num,
            dry_run=args.dry_run,
        )
        results.append(res)

    # 7. 汇总汇报
    print("\n" + "=" * 50)
    print("🏆 赛马任务分发完成:")
    success_count = sum(1 for r in results if r.get("ok"))
    print(f"   成功启动: {success_count}/{len(results)}")
    for r in results:
        status = "✅" if r.get("ok") else "❌"
        print(f"   {status} Worker {r.get('worker')}: {r.get('agent')} -> 分支: {r.get('branch', '无')}")
    print("=" * 50)


if __name__ == "__main__":
    main()
