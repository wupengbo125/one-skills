---
name: one-development-workflow
description: "开发流程：改代码前受理需求，改代码后测试+双sub-agent code review+需求核对。用户让开发/改代码/实现功能时触发。"
argument-hint: "需求描述或需求文档路径"
---

# 开发流程 (Development Workflow)

流程型开发守则，确保只做用户要的，不多做。详细步骤见 [references/workflow.md](references/workflow.md)。

## 五步流程

1. **需求受理**：改代码前，把用户需求写清楚（做什么、不做什么）。
2. **开发**：只按需求改，不动其他。
3. **测试**：能测就测，测不了说明原因。
4. **Code Review**：调用 `one-code-review`，双 sub-agent 并行审查——代码质量轴 + 需求符合轴（拿第1步的需求当参考文档，重点查范围蔓延）。
5. **需求核对**：对照用户原始需求，逐条核对：我改的每一行，用户需求里包含吗？多了立刻删。

## 铁律

**让改A只改A，别瞎动其他，否则一定被骂，甚至导致财产损失。**
