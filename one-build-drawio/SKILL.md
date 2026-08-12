---
name: one-build-drawio
description: 根据业务蓝图、代码模块或需求方案书 (PRD)，使用 drawio-skill 生成标准的 draw.io 流程图/架构图 (.drawio 及预览图)。
disable-model-invocation: true
---

# Build Draw.io Diagram

根据用户指定的业务蓝图、代码模块或需求方案书（PRD），调用 `drawio-skill` 生成对应模块/流程的可视化 `draw.io` 图表文件。

## 流程

### Step 1: 提取流程与架构数据

根据用户指令解析模式：
- **全量模式（蓝图/代码）**：读取用户指定或与目标作用域匹配的业务蓝图，或分析指定范围内的代码路由，提取起始点、决策节点、服务组件与终点链条。
- **变更对比模式（需求/PRD）**：读取指定的 `docs/prd/` 变更方案，与变更前的旧流程/架构进行对比，提炼出新增、删除及修改的节点与路径。

- **完成标准**：提取出清晰的节点、连线与层级结构数据。

### Step 2: 使用 `drawio-skill` 绘制图表

调用 `drawio-skill` 规范生成 `draw.io` 图表：
1. **生成 XML**：基于提取的数据，直接生成标准的 `.drawio` 文件（放在目标业务目录下，例如 `diagram.drawio` 或 `<name>.drawio`）。
2. **结构规则**：
   - 全量模式：清晰展现模块层次与流程方向（Top-Bottom 或 Left-Right）。
   - 变更对比模式：使用样式高亮标记新增（绿色）、删除（红色虚线）与修改（蓝色）节点。

- **完成标准**：在目标目录下输出可编辑的 `.drawio` 图表文件。


