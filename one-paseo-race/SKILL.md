---
name: one-paseo-race
description: "Paseo 多 Agent 赛马调度器：同一个 Issue 或提示词并发派给多个 Agent，每匹一个独立 worktree 分支，跑完统一回收比对。"
disable-model-invocation: true
argument-hint: "-a <agent[:model]...> [-i <issue>] [-p <prompt>] [-b main] [--timeout 30m]"
---

# One Paseo Race (Paseo 多 Agent 并行赛马)

同一需求 / Issue 同时派给多个 Agent，各跑一个 Paseo workspace（worktree 隔离 + 独立分支），并发完成后统一回收比对。

## 核心能力

1. **多 Provider / 多模型齐跑**：`-a codex:gpt-5.4 claude:opus-4.6 omp pi`，语法 `agent[:model]`。
2. **worktree 隔离**：每匹马 `--new-workspace worktree --worktree-mode branch-off --new-branch <名> --base <基线>`，互不踩代码。
3. **分支名防撞**：`<🐎-><随机3位>-<agent>[-<model>]-<Issue标题>`，随机 3 位每匹马各生成一个并在同轮去重，`-a omp omp` 也不撞。标题只做 git ref 合法化，不截断（自己把 Issue 标题写短）。
4. **Issue + Prompt 组装**：`gh issue view` 抓详情，拼上赛马规则注入。
5. **一屏回收**：每匹马打 `--label race=<赛次>`，`paseo ls --label race=<赛次> -g` 就是全场记分牌。

## 常用命令

```bash
prace -a codex:gpt-5.4 claude:opus-4.6 omp -i 123 -p "实现并加单测，写完自测通过"
prace -a codex claude --dry-run          # 只看计划
prace -a codex claude --timeout 30m      # 发完就地等结果
```

（脚本 `scripts/prace`；dotfiles/bin/prace 是它的相对软链，全局命令即 `prace`。Orca 版叫 `orace`。）

### 参数
- `-a, --agents`：参赛 `agent` 或 `agent:model`（空格分隔）；省略时用默认 Agent。Paseo 无 effort 概念，`--thinking` / `--mode` 走 provider 原生，需要就自己改脚本加透传。
- `-sda, --set-default-agent <agent>`：记住默认 Agent（`~/.config/prace/default-agent`），之后可省略 `-a`。
- `-i, --issue`：Issue 编号或 URL；`-1` 最新一条 open（默认），`-2` 倒数第二。
- `-p, --prompt`：追加指令。`-b, --base-branch`：基线分支（默认 `main`）。
- `--timeout <duration>`：发完马后 `paseo wait` 每个 agent（`30s` / `10m` / `1h`）。不给就发完即返回。
- `--host <host:port>`：打到远程 daemon（`--cwd` 是那台机器上的路径）。
- `--dry-run`：只打印命令，不真的创建。

## Provider 映射（Orca 版 → Paseo 版）

| race 写法 | Paseo `--provider` | 说明 |
|---|---|---|
| `claude` / `codex` / `opencode`(或 `omp` 外的) / `pi` / `omp` | 同名 | 原生 provider，`--model` 用 provider 自家模型 id |
| `codebuddy` | `codebuddy` | ACP catalog 一键装，装过才能参赛 |
| `cursor` / `amp` / `cline` / 其他 | 同名 | ACP catalog 里的都能参赛 |

查当前能上场的马：`paseo provider ls`（或 App 里的 provider catalog）。

## 判胜负

Paseo 是托管会话，没有 Orca 那套 "Do you trust this folder" 弹窗吞 prompt 的问题，`race` 里 sleep+轮询的 hack 这里不需要。收卷两条路：

1. **人眼**：`paseo ls --label race=<赛次> -g` 看状态 → `paseo inspect <id>` / `paseo logs <id>` / `paseo attach <id>`。
2. **机器判卷**：给每匹马加 `--output-schema <schema.json>`，让它们交结构化答卷（改了哪些文件、测试是否通过、自评置信度），再横向比。`--output-schema` 在脚本里没默认开启，要就自己加。

挑中的分支直接合；其余 `paseo workspace archive` 收掉。

## 注意

- 脚本用 `--json -q` 取 agentId，不同 Paseo 版本的 JSON 外层可能变；取不到时会打印 `paseo ls --label race=<赛次>` 兜底，别照着旧输出硬编码解析。
- worktree 由 Paseo 托管创建，**不要**自己 `git worktree add`，否则 daemon 认不到这个 workspace。
