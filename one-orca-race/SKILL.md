---
name: one-orca-race
description: "Orca 多 Agent 赛马调度器：将 GitHub Issue 或提示词同时分发给多个 Agent（支持指定不同模型、不同 Agent 品牌如 Codex/Claude/OMP/CodeBuddy），为每位 Agent 自动创建独立 Git Worktree 并发运行比对。"
argument-hint: "-a <agent[:model]...> -i <issue> -p <prompt>"
---

# One Orca Race (多 Agent 并行赛马)

将同一个需求或 GitHub Issue 同时指派给多个不同的 Agent（甚至每个 Agent 绑定不同模型），为它们各自拉出独立的 Git Worktree 分支并在 Orca 中并发跑起来。

## 核心能力
1. **多模型/多Agent齐跑**：支持 `codex`、`claude`、`omp`、`codebuddy`（腾讯 CodeBuddy）、`pi`、`antigravity` 等混编参赛。
2. **支持指定模型**：语法 `agent:model:effort`（如 `codex:o3-mini:high`、`claude:claude-3-7-sonnet`、`omp`、`codebuddy`）。
3. **独立分支隔离**：每个 Agent 自动分配独立 Git Worktree，避免代码互相踩踏与写冲突。
4. **分支名防撞**：分支名格式为 `<🐎-><随机3位>-<agent>[-<model>]-<Issue标题>`。随机 3 位数字**每位参赛马各生成一个**并在同轮内去重，所以 `-a omp omp` 这种同名马也不会撞；同名 agent 绑不同模型也能区分。标题**不做截断**（由用户自己把 Issue 标题写短），只把 git ref 非法字符（空格 `~ ^ : ? * [ ] \ /`）换成 `-`，标题为空时以 `issue-<编号>` 兜底。
5. **Issue + Prompt 自动组装**：直接读取 GitHub Issue 内容并拼装自定义指令注入各 Agent 终端。

## 常用命令

```bash
race \
  -a codex:o3-mini claude:claude-3-7-sonnet omp codebuddy \
  -i 123 \
  -p "实现并添加单元测试，写完自测通过"
```

（脚本位于 `scripts/race`，已通过 `dotfiles/bin/orace` 暴露为全局命令 `orace`；Paseo 版叫 `prace`）

### 参数说明
- `--agents, -a`: 参赛 Agent 列表（空格分隔），支持 `agent` 或 `agent:model` 或 `agent:model:effort`。
- `--issue, -i`: GitHub Issue 编号或 URL，自动通过 `gh issue view` 抓取详情。支持负数倒数：`-1` 取最新一条 open issue（等价于不传 `-i`），`-2` 取倒数第二条，以此类推。
- `--prompt, -p`: 自定义或补充提示词。
- `--base-branch, -b`: 切分支基准（默认 `main`）。
- `--dry-run`: 仅做语法解析和计划展示，不实际创建分支和启动终端。
