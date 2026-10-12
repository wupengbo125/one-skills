---
name: one-implement-paseoagent
description: "把计划派给别的 paseo agent 干。"
disable-model-invocation: true
---

# One Paseoagent-Implement

主会话只做协调：派活、审查、记账。代码由别的会话写。

**只在 paseo 里能用**（靠 `create_agent` / `send_agent_prompt` 起会话）；没有 paseo 就用 `one-implement-subagent`。
先读 **paseo** 技能（`create_agent` / `send_agent_prompt` / `get_agent_status` / `list_profiles`）。

**两个角色，按 profile 的 `notes` 标签挑 —— 不看名字、不写死 provider/model：**

`notes` 里带 `role: implement` / `role: review`，加 `prio: N`（1 主、2 备）。

| 干什么 | 找哪个标签 |
|---|---|
| 写代码（implementer、修复） | `role: implement` |
| 审查（每任务、整体） | `role: review` |

起会话前 `list_profiles`，按标签挑，`prio` 从小到大试：通了就用，报错就换下一个（证书错、provider 不通都算）。
provider / model / modeId / thinkingOptionId / featureValues 全从挑中的 profile 里拿，照 paseo 技能"把 profile 摊进 `create_agent`"那段做。
一个带标签的都没有、或全试完都不通 → 报给用户，不许自己编 provider。

## 硬规则

- **没拿到用户的 `aaa` 不许派活；派活时把 `aaa` 一起带上**，否则 subagent 卡在宪法门禁上回头找你要暗号。
- **provider/model 从 profile 里取、显式写**；不写就继承你的模型（通常是最贵那个）。
- **一个任务一个干净 subagent**，brief 里自带它要的一切（它没有你的会话历史）。
- **派完别守着**，别轮询 `list_agents` / `get_agent_status`，`notifyOnFinish` 会来找你。
- **implementer 不准再派 subagent**（brief 里写明），审查由你派。
- **同一时刻只派一个 implementer**，并行改同一份代码必打架。

## 一轮的流程

### 1. 派 implementer

- 把任务原文写进 brief 文件（`<工作目录>/briefs/task-<N>.md`），派工时只给路径，别把计划塞进 prompt。
- brief 带：任务原文、要碰的接口/文件、全局约束、报告文件路径、"写完自己跑测试、自己提交"。
- `create_agent({ title: "[Task N] <一句话>", provider: <挑中的 implement profile 的 provider/model>, settings: <它的 modeId / thinkingOptionId / featureValues>, initialPrompt: ... })`
- 记下 `agentId` —— 修复循环 1-3 轮还要找它。

### 2. 看报告

implementer 只回四选一：

| 状态 | 怎么办 |
|---|---|
| DONE | 生成 diff 文件，派审查 |
| DONE_WITH_CONCERNS | 先读它的顾虑；涉及对错/范围就先解决，再审查 |
| NEEDS_CONTEXT | 补上下文，重派 |
| BLOCKED | 缺上下文→补；太大→拆小；计划本身错→你裁决并记进 ledger，再重派 |

### 3. 派审查

- 把 diff 写成文件（`git log --oneline` + `git diff --stat` + `git diff -U10`），审查员读文件，别让 diff 进你的上下文。
- 审查员用 `role: review` 的 profile 起（provider/model 和 settings 从它里面取），拿到 brief、报告、diff 路径和全局约束原文，**只读**，结尾加：
  `只分析不动手：禁止新建、修改、删除任何文件，也不要执行会改动它们的命令。`
- 细则见 `skill://one-code-review`，连同上面那些一起给审查员。
- 别预先替审查员判"这条不用提"。

### 4. 修复循环（最多 5 轮）

- 只有「不符合需求」或有阻塞/重要问题才进循环，小问题记进 ledger。
- **第 1-3 轮**：`send_agent_prompt` 回原 implementer，问题原文给它（它上下文还在）。
- **第 4-5 轮**：新开一个 implementer，告诉它"前面有人试过 N 次，报告在 <路径>"；它看不见自己的问题时，换新眼睛比继续磨强。
- 每轮修完**必须**复审（只看修复 diff），确认已解决/未解决，顺手看有没有引入新问题。
- 到第 5 轮还有问题就停，你自己裁决并记进 ledger：审查员错了 / 不阻塞后续 → 挂起；
  后续依赖 → 裁决最小改法，带进下一个任务的 brief。

### 5. 记账

进度写在 `<工作目录>/progress.md`，一行一件事：

```
Task 1: complete (commits a1b2c3d..d4e5f6a, 审查通过)
Task 2: fix round 1/5 (2 已解决, 1 未解决)
Task 2: parked — <问题> — 理由: <为什么可以放着>
```

上下文丢了就靠它 + `git log` 恢复，别信记忆。

## 收尾

全部任务完事：派一个**整体审查**（`role: review` 的 profile，拿整支 diff，细则同 `skill://one-code-review`），
把 ledger 里挂起的小问题一起给它判。有意见就派**一次**修复（一个 subagent 拿全部问题），再复审一次。

最后把 ledger 里每条 `Ruling:` / `parked` 抄进总结发给用户 —— 你替用户做的决定必须让他看见。
