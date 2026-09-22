---
name: one-herdr-race
description: "Herdr 多 Agent 赛马调度器：同一个 GitHub Issue 同时派给多个 Agent（可各绑模型），每匹马一个 git worktree workspace + 独立 pane 并发跑，可选 wait 到 done 再统一收卷。用户提到 Herdr 赛马、Herdr 多 agent 同题竞跑、用 Herdr 并行跑多个 agent 比谁写得好时用它。和 orace(Orca)/prace(Paseo) 的区别是 Herdr 在真终端里跑真 CLI 并识别 idle/working/blocked/done 生命周期。"
argument-hint: "-a <agent[:model]...> [-i <issue>] [-p <prompt>] [-b main] [--timeout 600000] [--machine <名字>]"
---

# One Herdr Race (Herdr 多 Agent 并行赛马)

同一需求 / Issue 同时派给多个 Agent，各开一个 worktree workspace + pane 并发跑。

## 核心能力

1. **多 kind / 多模型齐跑**：`-a codex:gpt-5.4 claude omp`，语法 `agent[:model]`。
2. **worktree + pane 隔离**：每匹马 `herdr worktree create --branch <名> --base <基线>`，互不踩代码。
3. **能等到跑完**：`--timeout <ms>` 时每匹马发完 prompt 再 `agent wait`，等到 idle/done/blocked 才收卷；不等就秒回。
4. **分支名防撞**：`<🐎-><随机3位>-<agent>[-<model>]-<Issue标题>`，随机 3 位每匹马各生成一个并在同轮去重。
5. **Issue + Prompt 组装**：`gh issue view` 抓详情，拼上赛马规则注入。

## 常用命令

```bash
hrace -a codex:gpt-5.4 claude omp -i 123 -p "实现并加单测，写完自测通过"
hrace -a omp claude --timeout 600000        # 发完等到 done
hrace -a codex --dry-run                    # 只看计划
hrace -a codex --machine "Build machine"     # 打到已保存的 SSH 机器
```

（脚本 `scripts/hrace`；`dotfiles/bin/hrace` 是它的软链，全局命令即 `hrace`。）

### 参数
- `-a, --agents`：参赛 kind 或 `kind:model`（空格分隔）；省略时用默认 Agent。kind 取 `herdr agent start --kind` 那 22 个：`pi claude codex gemini cursor devin agy cline omp mastracode opencode copilot kimi kiro droid amp grok hermes kilo qodercli qwen maki muse`。
- `-sda, --set-default-agent <kind>`：记住默认（`~/.config/hrace/default-agent`）。
- `-i, --issue`：Issue 编号或 URL；`-1` 最新一条 open（默认），`-2` 倒数第二。
- `-p, --prompt`：追加指令。`-b, --base-branch`：基线分支（默认 `main`）。
- `--timeout <ms>`：发完 prompt 后 `agent wait` 的毫秒数（默认上限 600000）。不给则发完即返回。
- `--machine <名字>`：走 `herdr --machine` 前缀打到远程机器（需先 `herdr machine` 保存）。
- `--dry-run`：只打印命令。

## 判胜负

```bash
herdr agent list                                             # 看各匹马状态
herdr agent read hcodex-196 --source recent-unwrapped --lines 120   # 收卷
herdr worktree list                                          # 各马的 checkout
```

worktree 落在 `<worktrees.directory>/<repo>/<branch-slug>`，就是普通 `git worktree`，挑中的直接合，其余 `herdr worktree remove --workspace <id>`。

## 注意

- **agent 名只认 `[a-z][a-z0-9_-]{0,31}`**：`🐎-750-codex-...` 这种只能当分支名/label，脚本另起了 `hcodex-196` 这种短名（带本马随机 3 位，避免和上一轮残留撞名）。
- `agent start` 要求 pane 停在 shell 提示符——worktree create 出来的新 pane 天然满足，所以没有 Orca 版那套 sleep + 轮询 trust 弹窗的 hack。
- pane id 从 `worktree create` 的 JSON 里取（`.result.root_pane.pane_id`），不同版本 JSON 外层可能变，脚本做了多路径兜底，取不到会报错而不是硬猜。
