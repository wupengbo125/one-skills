---
name: one-harness
description: "代码开发与重构流程（主架构 + Worker + 双轴审查 + 蓝图同步）。用户手动调用，禁止自行使用本技能"
argument-hint: "需求描述、修改说明或需求文档路径"
disable-model-invocation: true
---

# 代码开发与实施流程

编写、修改、重构代码时的**唯一总入口**。
核心原则：**主 Agent 是纯架构者，只设计与派活，绝不亲自写业务代码；改动功能必须同步更新全局活蓝图。**

## 流程

```
1. 架构与边界（主 Agent：提取 Target & Non-Goals，检索蓝图，严禁改代码）
2. 隔离实现（派 Worker：全新上下文，编码 + 同步蓝图，CP 防瞎写）
3. 测试验证（Worker 跑针对性测试）
4. 双轴审查（派 A/B 并行查 git diff）
5. 交付闸门（主 Agent 验收、写海马记忆、commit 并交付）
```

## 一、主 Agent 架构者职责

1. **绝对禁令**：主 Agent 严禁直接写业务代码。
2. **意图锚定**：从对话提炼 Target（必做）与 Non-Goals（禁扩展）。
3. **蓝图接入**：找 `BLUEPRINT.md`（或 `docs/BLUEPRINT.md`），把相关上下文注入 Worker，要求改代码同时更新蓝图。
4. **计划与台词确认**：先和用户对齐平铺 plan（一行一行）并告知审查台词；用户说"动手"后才开工；审查台词一字不差透传，不总结转译。

## 二、派 Worker 实现

派全新 Sub-agent 实现，编码守则见 [references/worker-brief.md](references/worker-brief.md)。Worker 完工只回简短总结（改动文件、测试、蓝图同步），主会话上下文保持干净。

## 三、双轴审查

主 Agent 不肉眼看代码，并行派 A/B 两个 Sub-agent，细则见 [references/review.md](references/review.md)。两轴皆 PASS 才交付。

## 四、交付闸门

- 打回：派 Worker 修复后重审。
- 通过：确认蓝图已同步 → 写海马记忆 → `git commit` + `git push` → 极简交付。
