---
name: one-paseo-review-lite
description: "轻型代码审查：单 Agent 极简快审，聚焦 Matt 纯粹 Spec 轴等号审查（改多了/改少了/改偏了）"
argument-hint: "[--agent <provider>[:<model>]]"
disable-model-invocation: true
---

# 轻型代码审查 (One Paseo Review Lite)

单任务完成、高频小步迭代、日常提交前快速核验时使用。

**用户输入参数：** `$ARGUMENTS`

---

## 一、审查核心聚焦 (Spec 等号三问)

1. **改多了？** Diff 里是否有需求没提的多余修改、多余抽象或私带私货。
2. **改少了？** 需求或平铺计划中的要点是否遗漏未做。
3. **改偏了？** 实现逻辑是否和需求描述存在偏差或逻辑错误。

---

## 二、派单执行机制

### 1. 评审员选择
- **默认 Agent**：`codebuddy-code/space-bunny`（开箱即用跨模型快审）。
- **自定义模型**：`--agent <provider>[:<model>]`。想看还有谁能上场，调 `list_providers`。

### 2. 派单流程
1. **先读 paseo 技能**：获取 `create_agent` 参数规范。
2. **提取起点提交 ID**：**优先从收敛需求文档顶部读取 `起点提交：<id>`**；若文档未记录或无文档，向用户确认起点提交，禁止臆测。
3. **提取需求**：平铺计划或收敛需求。若独立手工调用本技能，派单前需先执行 `git add -N .` 暂存工作区未跟踪新文件。
4. **调用 `create_agent`**：
   - `title`：`[Review-Lite] <一句话主题>`
   - `provider`：`codebuddy-code/space-bunny`（或用户指定值）
   - `initialPrompt`：读取模板 [references/lite-prompt.md](references/lite-prompt.md)，将 `{{REQUIREMENTS}}` 替换为提取的需求、将 `{{BASE_COMMIT}}` 替换为确认的起点提交 ID（严禁遗留字面量占位符）
   - `notifyOnFinish`：`true`
5. 发出后等待系统通知，**严禁主动轮询**。

---

## 三、收卷与结果判定

1. **契约输出格式**：
   - 首行必须是：`结论: 通过` 或 `结论: 不通过`。
   - **通过时**：正文为空，干净利落。
   - **不通过时**：仅列出 Spec 差异问题列表（`- [文件:行号] <偏差原因> (改多了/改少了/改偏了)`），无冗余寒暄。

2. **处置原则**：
   - 首行「结论: 通过」且无正文：验收通过，直接交付。
