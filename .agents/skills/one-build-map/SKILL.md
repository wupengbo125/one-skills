---
name: one-build-map
description: 初始化项目的结构地图 (MAP.md)、用户指令文件与 Agent 导航区块。在新新建项目或初始化文档体系时使用。
disable-model-invocation: true
---

# Init Maps

初始化项目的结构文档与导航体系：
1. **`MAP.md`**：记录物理文件结构与模块依赖地图。

## 流程

### Step 1: 扫盘与 OpenWiki 检测
- 检查项目根目录是否存在 `openwiki/` 目录：
  - **若存在 `openwiki/`**：跳过 `MAP.md` 的生成
  - **若不存在 `openwiki/`**：按正常流程初始化 `MAP.md`。
- 遍历项目目录结构，识别主要代码模块与结构边界。

### Step 2: 建立结构地图 (MAP.md)
- **注意：若 Step 1 检测到 `openwiki/` 目录存在，则跳过此步骤**。
- 读取本 skill 目录下的 `MAP-TEMPLATE.md` 模板。
- 根据当前项目实际代码结构生成根目录及各独立模块/子目录下的 `MAP.md`。

### Step 3: 报告完成
- 告知用户 `MAP.md` 已初始化完成。
