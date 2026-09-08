# 记忆沉淀指南

## 核心规则

- **每日一个文件**：全部流水写入当天文件 `memory/<YYYY-MM>/<YYYY-MM-DD>.md`，不建主题文件。
- **豆包式流水**：内容为自然语言流水行，记"当天做了什么 + 关键结论 + 待办"，不写过程细节、不写结构化长文。
- **三态记忆（对齐豆包）**：daily 每日流水进 `memory/`；**稳定偏好**追加 `preference.md`；**任务**按会话 ID 存 `tasks/<会话ID>.md`，每会话一个文件，写流水时自动更新当前会话的 task（有则更新，无则新建）。
- **commit 即记**：每次 git commit 前，自动向当天文件追加一行流水（这就是自动上限，不等用户开口）。

## 触发时机

- 每次 commit（代码/配置修改、关键决策、新需求、新偏好）
- 用户说"收工"

## 执行步骤

1. 打开当天文件 `memory/<YYYY-MM>/<YYYY-MM-DD>.md`，不存在则创建，在末尾追加一行流水，开头标注 task ID（=会话 ID）。
2. 获知用户身份、习惯或喜好时，更新 `system/profile.md`。
3. 获知**稳定偏好**时，追加/更新 `preference.md`（一条一条，不按天）；无对应分类时新建 `## 分类名` 小节，不新建文件、不加新态。
4. **任务管理（task ID）**：每次写流水时，流水里每条记录带 task ID（=会话 ID）。检查 `tasks/<taskID>.md` 是否存在，存在则更新过程摘要，不存在则新建。
5. 同步索引：`python3 ~/onespace/github/one-skills/one-memory/scripts/memory.py sync "<当天文件路径>"`。
6. **先提交海马体**：在 `~/onespace/github/one-hippocampus/` 执行 `git commit && git push`，拿到本次 commit hash（如 `1c81185`）。
7. **再提交代码仓库**：回到代码仓库，commit message 必须带 `[memory: <hash>]`（如 `[memory: 1c81185] 实际改动说明`），然后 `git push`。pre-commit hook 会验证 hash 真实存在于海马体仓库，不存在则拒绝提交。
8. 用户手动提交：用 `git commit --no-verify` 跳过 hook。

## 每日文件内容格式（与豆包一致）

每次追加一行流水，**开头标注 task ID（=会话 ID）**（如 `[38440483288583938]`），覆盖本次改动、结论、待办。每件事一行，新的事另起一行，行与行之间用 `---` 分隔。

流水是摘要（summarize），task 是详细。检索流程：查流水/索引 → 拿到 task ID → 去 `tasks/<taskID>.md` 找详细过程。

示例：

> [38440483288583938] 用户要求将海马体记忆改为每日一个文件，格式与豆包记忆一致。已重写 memory.md 规程。
>
> ---
>
> [38440483288583938] 第二件事...

## 历史文件

改造前的主题文件（`<YYYY-MM-DD>_主题.md`）保留为历史档案，不删除、不合并。
