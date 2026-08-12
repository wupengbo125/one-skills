---
name: one-build-mermaid
description: Generate an interactive HTML flowchart visualizing product user workflows from a user-specified business blueprint, code scope, or docs/prd/.
disable-model-invocation: true
---

# Build Flowchart

根据用户指定的业务蓝图、代码模块或需求方案书（PRD），生成对应模块/流程的可视化 HTML 流程图。

## 流程

### Step 1: 提取流程数据

根据用户指令解析模式：
- **全量模式（蓝图/代码）**：读取用户指定或与目标作用域匹配的业务蓝图，或分析指定范围内的代码路由，提取起始点、决策节点与终点全量链条。不得默认把根目录 `BLUEPRINT.md` 当成其他业务范围的上级蓝图；存在多份候选且无法判断时，询问用户选择哪一份。
- **变更对比模式（需求/PRD）**：读取指定的 `docs/prd/` 变更方案，与变更前的旧流程/蓝图进行对比，提炼出新增、删除及修改的节点与路径。

- **完成标准**：提取出全量流程数据，或识别出清晰的新旧流程节点差异（新增/删除/修改）。

### Step 2: 绘制流程图 HTML

读取本 skill 目录下的 `GRAPH-TEMPLATE.md` 模板，在用户指定的业务范围或被分析目录下生成或更新 `flowchart.html`：
- 全量模式使用**全量流程图**结构。
- 变更对比模式使用**变更对比**双栏结构，高亮标记新增（绿色）、删除（红色虚线）与修改（蓝色）节点。

- **完成标准**：在被分析目录下输出/更新单个包含 `flowchart.html`，可在浏览器中独立打开渲染。
