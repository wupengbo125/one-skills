---
name: one-paseo-review
description: 派一个别的 coding agent 复查你刚干的活。
argument-hint: "[--agent <provider>[:<model>]]"
disable-model-invocation: true
---

# One Paseo Review

你写完活，用这个技能叫一个评审员来复查。它是别的厂商的模型，看你的盲区比你多。

**用户输入：** $ARGUMENTS

## 谁来审

默认 `codebuddy-code/space-bunny`。

`$ARGUMENTS` 里点了 provider 或模型就用你点的：`--agent claude`、`--agent codex:gpt-5.4`。没点就用默认值，不问。

想看还有谁能上场，调 `list_providers`。

## 派单

先读 **paseo** 技能（`create_agent` 的完整参数语义在它里面），然后发出去：

- `title`：`[Review] <一句话主题>`
- `provider`：`codebuddy-code/space-bunny`，或你点名的那个
- `initialPrompt`：下面这份
- `notifyOnFinish`：开

发出去就等着，**不要轮询** `list_agents` / `get_agent_status`。通知自己会来。

## 评审员的 prompt

```
你是代码评审员。按规则评审下面这份实现。

需求：
{{把用户这次要审的需求正文贴进来；没有就给一句概括，说明本次要审的是哪部分改动}}

本轮起点提交：<commit>
规则：
1. 目标只读：只能看和用只读 git 命令，禁止任何改动。
2. 本轮改动 = 起点提交之后的一切（含未提交）。起点提交就是本次干活开始前仓库上的那个提交。
3. 按需求逐项核对，等号审查：总超出需求没有？是否少需求？再按标准看质量与风险。
4. 首行「结论: 通过」或「结论: 不通过」，下面只列问题（标阻塞）和一句话理由。简明。
```

起点提交从哪来：本次会话开始干活前的 HEAD。说不清就问用户，别猜。

## 收卷

拿到结论后报给用户：结论 + 问题清单。它说的问题不自动修 —— 真假由用户判断，要不要改由用户决定。

## 评审判定

结论首行是「结论: 通过」且下面没有正文 —— 干净收工。

有问题就念出来，说清哪些是阻塞的。用户说要改就改，改完可以再跑一次这个技能复审。