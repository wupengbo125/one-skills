---
type: workflow
title: 需求交互与架构规划工作流
description: 介绍基于 SPA 可交互单页原型、one-blueprint 全局活蓝图与 one-handoff 的需求确认、蓝图绘制与任务交接流程。
---

# 需求交互与架构规划工作流

在进行任何复杂的编码之前，需求讨论与设计规划工作流确保 AI 与开发者在需求边界、技术方案和交付标准上达成一致。

## 组成技能与职责

1. **SPA 可交互单页原型**：彻底摒弃传统长篇静态文档，采用单页应用（SPA）直接验证交互体验、组件状态与用户旅程。
2. [`one-blueprint`](file://$github_dir/one-skills/one-blueprint/SKILL.md)：架构活蓝图维护技能。参考 [`BLUEPRINT-TEMPLATE.md`](file://$github_dir/one-skills/one-blueprint/BLUEPRINT-TEMPLATE.md) 维护根目录下的 `BLUEPRINT.md`，确立纯业务逻辑（Trigger/Logic/Result/Rules）与真理之源。
3. [`one-handoff`](file://$github_dir/one-skills/one-handoff/SKILL.md)：任务交接技能。在开发任务阶段性结束或交接给下一位协同人员时，生成清晰的上下文、改动摘要与未尽事项文档。

## 工作流转换

```mermaid
sequenceDiagram
    autonumber
    actor Developer as 开发者
    participant SPA as SPA 单页原型 (交互/界面评审)
    participant Blueprint as one-blueprint (业务活蓝图)
    participant Impl as 代码实现工作流 (one-implement)
    participant Handoff as one-handoff

    Developer->>SPA: 构建/评审 SPA 单页原型验证交互
    SPA-->>Developer: 确认界面与用户流转体验
    Developer->>Blueprint: 梳理业务逻辑与边界 (BLUEPRINT.md)
    Blueprint-->>Developer: 明确纯业务逻辑触发与规则
    Developer->>Impl: 实施代码编写并锁定更新蓝图
    Impl-->>Developer: 完成测试验证与双轴评审
    Developer->>Handoff: 发起交接总结
    Handoff-->>Developer: 生成交接说明

## 相关知识库关系

- [代码实现与精简工作流](file://$github_dir/one-skills/onewiki/workflows/implementation-workflows.md) 消费本流程确立的 SPA 交互与蓝图指导代码编写。
- [结构映射与可视化工作流](file://$github_dir/one-skills/onewiki/workflows/structure-visualization.md) 协助生成系统架构与拓扑视图。
