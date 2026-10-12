---
name: one-paseoagent-implement
description: "把一份定好的计划派给别的 paseo 会话来干：一个任务一个干净 subagent（开发用 paseoagent-implement、审查用 code-review）+ 每任务审查 + 修复循环。只在 paseo 下能用，要执行计划、想省自己上下文时用它。"
---

# One Paseoagent-Implement（拿别的会话干活）

主会话只做协调：派活、审查、记账。代码由**别的会话**写。

**这个技能只在 paseo 里能用** —— 它靠 paseo 的 `create_agent` / `send_agent_prompt` 起会话。
没有 paseo 的环境（纯 Claude Code / Codex 之类）用不了，那种环境请用它们自带的 subagent。

跟普通 subagent 的差别：派出去的不必是同一个 agent。paseo 的 `create_agent` 能指定任意 provider/model。

**用哪两个，写死，不挑：**

| 干什么 | profile | provider/model | modeId |
|---|---|---|---|
| 写代码（implementer、修复） | `paseoagent-implement` | `codebuddy-code/deepseek-v4.1-flash` | `fullAccess` |
| 审查（每任务审查、整体审查） | `code-review` | `omp/google-antigravity/gemini-3.7-flash` | `full` |

起会话时把 `modeId` 和 `thinkingOptionId`（两个都是 `medium`）一起带上。

先读 **paseo** 技能（`create_agent` / `send_agent_prompt` / `get_agent_status` 的用法）。

## 什么时候用

- 手上已经有一份计划（票单、任务清单、平铺计划），任务之间基本独立。
- 想保住自己的上下文：派出去的会话有它自己的上下文，你只拿回结论。

任务紧耦合、或者还没想清楚要干什么 —— 先别用，先想。

## 硬规则

- **provider/model 必须显式写，就按上面那张表。** 不写就继承你的模型（通常是最贵那个）。
- **一个任务一个干净 subagent。** 它不知道你的会话历史，brief 里必须自带它要的一切。
- **派完别守着。** 不要轮询 `list_agents` / `get_agent_status`，`notifyOnFinish` 会来找你。它跑十几分钟很正常。
- **implementer 不准再派 subagent**（brief 里写明）。审查由你派，它自己派一份是重复的。
- **同一时刻只派一个 implementer**，并行改同一份代码必打架。

## 一轮的流程

### 1. 派 implementer

- 把任务的**原文**写成 brief 文件（`<工作目录>/briefs/task-<N>.md`），派工时只给路径，别把计划全文塞进 prompt。
- `create_agent({ title: "[Task N] <一句话>", provider: "codebuddy-code/deepseek-v4.1-flash", settings: { modeId: "fullAccess", thinkingOptionId: "medium" }, initialPrompt: ... })`
- brief 里带：任务原文、要碰的接口/文件、全局约束、报告文件路径、以及"写完自己跑测试、自己提交"。
- 记下返回的 `agentId` —— 修复循环 1-3 轮还要找它。

### 2. 看报告

implementer 只回四选一：

| 状态 | 怎么办 |
|---|---|
| DONE | 生成 diff 文件，派审查 |
| DONE_WITH_CONCERNS | 先读它的顾虑；涉及对错/范围就先解决，再审查 |
| NEEDS_CONTEXT | 补上下文，重派（同一个模型） |
| BLOCKED | 缺上下文→补；太大→拆小；计划本身错→你裁决并记进 ledger，再重派 |

### 3. 派审查

- 把 diff 写成文件（`git log --oneline` + `git diff --stat` + `git diff -U10`），审查员读文件，别让 diff 进你的上下文。
- 审查员用 `code-review` 起：`provider: "omp/google-antigravity/gemini-3.7-flash"`, `settings: { modeId: "full", thinkingOptionId: "medium" }`。
- 审查员拿到：brief 路径、报告路径、diff 文件路径、全局约束原文。**只读**，结尾加：
  `只分析不动手：禁止新建、修改、删除任何文件，也不要执行会改动它们的命令。`
- 审查要出两个结论：**符合需求吗**（多了/少了/需求本身有 bug）和**质量行不行**。缺一个都不算审完。
- 别预先替审查员判"这条不用提" —— 有意见让它提，你在循环里裁决。

### 4. 修复循环（最多 5 轮）

- 只有「不符合需求」或有阻塞/重要问题才进循环。小问题记进 ledger，不进循环。
- **第 1-3 轮**：`send_agent_prompt` 回原 implementer，把问题原文给它（它上下文还在）。
- **第 4-5 轮**：**新开**一个 implementer（还是 `paseoagent-implement`），告诉它"前面有人试过 N 次，报告在 <路径>"。
  三轮还过不去，通常是它看不见自己的问题，换一双新眼睛比继续磨强。
- 每轮修完**必须**复审（只看修复 diff），确认"已解决/未解决"，顺手看修复有没有引入新问题。
- 到第 5 轮还有问题就停，你自己裁决：审查员错了→挂起并写明理由；是真的但不阻塞后续→同样挂起；
  真的且后续任务依赖它→裁决最小改法，记进 ledger，带进下一个任务的 brief。

### 5. 记账

进度写在 `<工作目录>/progress.md`，一行一件事：

```
# 计划: <计划文件路径>
Task 1: complete (commits a1b2c3d..d4e5f6a, 审查通过)
Task 2: fix round 1/5 (2 已解决, 1 未解决; commits ...)
Task 2: parked — <问题> — 理由: <为什么可以放着>
Task 3: complete (commits ..., 2 条挂起)
```

上下文丢了就靠它 + `git log` 恢复，别信自己的记忆（重新派已经做完的任务是最贵的错）。

## 收尾

全部任务完事：派一个**整体审查**（`code-review`，拿整支 diff），把 ledger 里挂起的小问题一起给它，
让它判哪些必须合并前修掉。有意见就派**一次**修复（一个 subagent 拿全部问题，不是一个问题一个），
再复审一次。之后不再开第二轮。

最后把 ledger 里每一条 `Ruling:` / `parked` 抄进总结发给用户 —— 你替用户做的决定必须让他看见。

## 常见偷懒借口

| 借口 | 事实 |
|---|---|
| "差不多符合需求了" | 审查员找出缺需求就是没做完。修，或者到轮数上限裁决。 |
| "我自己顺手改了吧" | 你改的没人审，还把上下文搞脏。回给 implementer。 |
| "再来一轮就收敛了" | 过上限的轮次不收敛，是结构问题。裁决、挂起、往下走。 |
| "这条明显是误报，删了" | 只在轮数上限裁决，而且必须记进 ledger。不许悄悄丢。 |
| "修复很小，不用复审" | 没复审的修复就是回归的入口。每轮都要复审。 |
| "派 subagent 太麻烦，我直接干" | 那你就是在拿最贵的模型干最机械的活。 |
