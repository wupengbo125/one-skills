---
type: workflow
title: 需求讨论与设计规划工作流
description: 介绍基于 one-grill-with-docs-prd、one-build-blueprint 与 one-handoff 的需求澄清、蓝图绘制与任务交接流程。
---

# 需求讨论与设计规划工作流

在进行任何复杂的编码之前，需求讨论与设计规划工作流确保 AI 与开发者在需求边界、技术方案和交付标准上达成一致。

## 组成技能与职责

1. [`one-grill-with-docs-prd`](file://$github_dir/one-skills/one-grill-with-docs-prd/SKILL.md)：需求澄清与 PRD 生成技能（触发词："讨论需求"、"grill" 或 "prd"）。通过多轮交互提问对需求做全面对齐，并在 `docs/prd/` 目录下生成标准 PRD。
2. [`one-build-blueprint`](file://$github_dir/one-skills/one-build-blueprint/SKILL.md)：架构蓝图构建技能。参考 [`BLUEPRINT-TEMPLATE.md`](file://$github_dir/one-skills/one-build-blueprint/BLUEPRINT-TEMPLATE.md) 编写根目录下的 `BLUEPRINT.md`，确立全局架构原则与技术栈边界。
3. [`one-handoff`](file://$github_dir/one-skills/one-handoff/SKILL.md)：任务交接技能。在开发任务阶段性结束或交接给下一位协同人员时，生成清晰的上下文、改动摘要与未尽事项文档。

## 工作流转换

```mermaid
sequenceDiagram
    autonumber
    actor Developer as 开发者
    participant Grill as one-grill-with-docs-prd
    participant Blueprint as one-build-blueprint
    participant Impl as 代码实现工作流
    participant Handoff as one-handoff

    Developer->>Grill: 发起需求讨论 ("grill")
    Grill-->>Developer: 提问澄清细节并输出 PRD (docs/prd/xxx.md)
    Developer->>Blueprint: 发起蓝图构建
    Blueprint-->>Developer: 生成/更新 BLUEPRINT.md
    Developer->>Impl: 附带暗号 "aaa" 实施代码编写
    Impl-->>Developer: 完成测试验证
    Developer->>Handoff: 发起交接总结
    Handoff-->>Developer: 生成交接说明
```

## 相关知识库关系

- [代码实现与精简工作流](file://$github_dir/one-skills/onewiki/workflows/implementation-workflows.md) 消费本流程产出的 PRD 和蓝图指导代码编写。
- [结构映射与可视化工作流](file://$github_dir/one-skills/onewiki/workflows/structure-visualization.md) 协助生成蓝图和 PRD 中的架构视图。
