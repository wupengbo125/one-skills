---
name: one-update-maps
description: 智能巡检代码结构与依赖变动，按需增量更新项目结构地图 (MAP.md)。在开发或重构完成后调用。
disable-model-invocation: true
---

# Update Maps

在代码开发、重构或需求落地完成后，智能巡检结构变事实，按需增量更新 `MAP.md`。

## 流程

### Step 1: 巡检变事实与 OpenWiki 检测
检查项目根目录是否存在 `openwiki/` 目录：
- **若存在 `openwiki/`**：跳过 `MAP.md` 更新，物理代码拓扑由 OpenWiki 自动化维护。
- **若不存在 `openwiki/`**：评估变动是否新增/删除文件、变更目录或改变模块依赖关系。忽略以 `.` 开头的隐藏目录，如 `.agents`、`.git` 等。

### Step 2: 按需更新结构地图 (MAP.md)
- **改变了结构**：更新根目录及受影响子目录 `MAP.md` 中对应的目录索引、文件链接或 Mermaid 依赖图。
- **未改变结构**：**保持 MAP.md 原样**，无需修改。

### Step 3: 输出巡检总结
向用户报告巡检结果：
- 说明哪些结构地图已被增量更新。
- 说明哪些结构地图因无变动或由 OpenWiki 管理而保持原样。
