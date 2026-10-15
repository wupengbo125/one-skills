---
name: one-implement-paseoagent
description: "把计划派给别的 paseo agent 干。"
disable-model-invocation: true
---

# One Paseoagent-Implement

**不要用 subagent 工具（`task` / `Task`）** —— 这里一律用 paseo 的 `create_agent` / `send_agent_prompt` 派活。

流程、硬规则、审查、修复循环、记账 —— 全按 `skill://one-implement-subagent` 走，只有派活按下面这套：

- 起会话用 paseo 的 `create_agent` / `send_agent_prompt`。
- **挑人按 `notes` 标签**：`list_profiles` → `role: implement`（写代码）/ `role: review`（审查），`prio` 小的先试，不通就换下一个（证书错、provider 不通都算）；一个带标签的都没有、或全试完都不通 → 报给用户，不许自己编 provider。
- provider / model / modeId / thinkingOptionId / featureValues 全从挑中的 profile 里拿，照 paseo 技能"把 profile 摊进 `create_agent`"那段做。
- 修复循环**第 1-3 轮**用 `send_agent_prompt` 回原会话（它上下文还在），**第 4-5 轮**新开一个。

先读 **paseo** 技能（`create_agent` / `send_agent_prompt` / `get_agent_status` / `list_profiles` 的用法）。
