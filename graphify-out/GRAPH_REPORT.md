# Graph Report - .  (2026-08-12)

## Corpus Check
- Corpus is ~5,404 words - fits in a single context window. You may not need a graph.

## Summary
- 197 nodes · 180 edges · 27 communities (25 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- LLM Wiki Skill & Compiler Module
- Chrome Pool Python Module
- Mermaid Flowchart Templates
- WSL Chrome Skill & Automation
- One Agents Guidelines
- Repository AGENTS Rules
- CLAUDE Rules & Guidelines
- Blueprint Builder Skill
- PRD Document Template
- Blueprint Document Template
- Simplifying & Refactoring Rules
- Install Others Shell Script
- Map Document Template
- Build Map Skill
- Update Maps Skill
- Agents Draw.io Skill
- Build Draw.io Skill
- Build Mermaid Skill
- Implement Router Skill
- Google OKF Templates
- Python Project Structure Skill
- Faithful Refactor Skill
- Install Main Shell Script
- Project Handoff Skill
- Minimal Implement Skill
- Grill With Docs PRD Skill

## God Nodes (most connected - your core abstractions)
1. `ChromePool` - 9 edges
2. `WSL Chrome Automation Skill` - 8 edges
3. `AI Coding Constitution` - 7 edges
4. `全功能 LLM Wiki 个人知识库 Skill (`one-llmwiki-skill`)` - 7 edges
5. `2. 模块一：知识库增量编译与素材摄入 (Compiler Module)` - 7 edges
6. `样式指南` - 6 edges
7. `<需求名称>` - 6 edges
8. `install-others.sh script` - 5 edges
9. `流程` - 5 edges
10. `HTML 流程图模板` - 5 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (27 total, 2 thin omitted)

### Community 0 - "LLM Wiki Skill & Compiler Module"
Cohesion: 0.11
Nodes (18): 1. 个人知识库目录架构 (按主题域隔离), 2. 模块一：知识库增量编译与素材摄入 (Compiler Module), 3. 模块二：语义 Lint 巡检与清洗 (Semantic Linter Module), 4. 模块三：知识库问答与检索 (Query & Chat Module), 5. 模块四：长文档 PageIndex 树状大纲推理 (PageIndex Reasoning Module), 6. Agent 操作流程汇总, 全功能 LLM Wiki 个人知识库 Skill (`one-llmwiki-skill`), 巡检流程 (+10 more)

### Community 1 - "Chrome Pool Python Module"
Cohesion: 0.15
Nodes (9): Browser, BrowserContext, ChromePool, 从 CDP HTTP 端点获取 WebSocket debugger URL。, WSL 环境下管理 Windows Chrome 多实例的连接池。 通过 PowerShell 启动 Windows Chrome（带 --remote-…, 启动第 index 个 Chrome 并返回 (browser, context)。 index 从 1 开始。每个实例使用独立的 profile 和调试端口。, 断开 Playwright 连接，但不杀 Chrome 进程（留给用户手动关闭）。, 通过 PowerShell 确保 Windows 目录存在。 (+1 more)

### Community 2 - "Mermaid Flowchart Templates"
Cohesion: 0.15
Nodes (12): Header, HTML 流程图模板, 全量模式（从蓝图/代码生成）, 变更对比模式（从 Spec 生成）, 字体, 总体气质, 样式指南, 流程图区域 (+4 more)

### Community 3 - "WSL Chrome Skill & Automation"
Cohesion: 0.17
Nodes (11): 1. Extract Cookies for yt-dlp (bypass YouTube/TikTok bot detection), 2. Automate Login to a Website, 3. Multiple Isolated Chrome Instances, Common Use Cases, How It Works, Key Principle, Location, Notes (+3 more)

### Community 4 - "One Agents Guidelines"
Cohesion: 0.18
Nodes (10): 1. 动笔前先思考 (Think Before Coding), 2. 至简至上 (Simplicity First), 3. 精准修改 (Surgical Changes), 4. 目标导向执行 (Goal-Driven Execution), 5. 特殊要求, AI Coding Constitution, Project Navigation, 拒绝为确定性事物写防御性代码 (+2 more)

### Community 5 - "Repository AGENTS Rules"
Cohesion: 0.20
Nodes (9): 1. 动笔前先思考 (Think Before Coding), 2. 至简至上 (Simplicity First), 3. 精准修改 (Surgical Changes), 4. 目标导向执行 (Goal-Driven Execution), 5. 特殊要求, Project Navigation, 拒绝为确定性事物写防御性代码, 拒绝写兜底方案 (+1 more)

### Community 6 - "CLAUDE Rules & Guidelines"
Cohesion: 0.20
Nodes (9): 1. 动笔前先思考 (Think Before Coding), 2. 至简至上 (Simplicity First), 3. 精准修改 (Surgical Changes), 4. 目标导向执行 (Goal-Driven Execution), 5. 特殊要求, Project Navigation, 拒绝为确定性事物写防御性代码, 拒绝写兜底方案 (+1 more)

### Community 7 - "Blueprint Builder Skill"
Cohesion: 0.22
Nodes (8): 1. 确定范围与位置, 2. 使用材料, 3. 生成或更新, 4. 交付, Build Blueprint, 完成标准, 核心规则, 流程

### Community 8 - "PRD Document Template"
Cohesion: 0.22
Nodes (8): 1. 背景与目标, 2. 需求描述, 3.1 明确包含 (In Scope), 3.2 明确不包含 (Out of Scope), 3. 需求边界, 4. 待确认与遗留问题, 5. 技术实施方案, <需求名称>

### Community 9 - "Blueprint Document Template"
Cohesion: 0.29
Nodes (6): 1. 项目介绍（人工编写）, 2. 功能, 3. 界面 (可选/无UI可省), <产品/业务名称>, <功能名>, <页面/视图名>

### Community 10 - "Simplifying & Refactoring Rules"
Cohesion: 0.29
Nodes (6): Simplifying, 之前（反例）, 之后（成功案例）, 原则, 成功案例：install.sh 129行 → 27行, 砍掉了什么

### Community 11 - "Install Others Shell Script"
Cohesion: 0.60
Nodes (5): draw_menu(), hide_cursor(), move_up(), install-others.sh script, show_cursor()

### Community 12 - "Map Document Template"
Cohesion: 0.33
Nodes (5): 1. <模块名> ([相对路径](./path/)), 子地图指引, 核心模块索引, 模块依赖与流向图, <项目/模块名称> 导航地图

### Community 13 - "Build Map Skill"
Cohesion: 0.33
Nodes (5): Init Maps, Step 1: 扫盘与 OpenWiki 检测, Step 2: 建立结构地图 (MAP.md), Step 3: 报告完成, 流程

### Community 14 - "Update Maps Skill"
Cohesion: 0.33
Nodes (5): Step 1: 巡检变事实与 OpenWiki 检测, Step 2: 按需更新结构地图 (MAP.md), Step 3: 输出巡检总结, Update Maps, 流程

### Community 15 - "Agents Draw.io Skill"
Cohesion: 0.40
Nodes (4): Build Draw.io Diagram, Step 1: 提取流程与架构数据, Step 2: 使用 `drawio-skill` 绘制图表, 流程

### Community 16 - "Build Draw.io Skill"
Cohesion: 0.40
Nodes (4): Build Draw.io Diagram, Step 1: 提取流程与架构数据, Step 2: 使用 `drawio-skill` 绘制图表, 流程

### Community 17 - "Build Mermaid Skill"
Cohesion: 0.40
Nodes (4): Build Flowchart, Step 1: 提取流程数据, Step 2: 绘制流程图 HTML, 流程

### Community 18 - "Implement Router Skill"
Cohesion: 0.40
Nodes (4): Implement Router, Step 1: 判定任务类型 (Task Classification), Step 2: 验证与交付, 流程

### Community 19 - "Google OKF Templates"
Cohesion: 0.40
Nodes (4): 1. 全局索引模板 (`index.md`), 2. 概念页面模板 (`concepts/<slug>.md`), 3. 实体页面模板 (`entities/<slug>.md`), Google OKF 规范模板与参考示例

### Community 20 - "Python Project Structure Skill"
Cohesion: 0.40
Nodes (4): Build Python Project (one-python-structure), 架构规范（标准三件套）, 核心开发准则, 流程

### Community 21 - "Faithful Refactor Skill"
Cohesion: 0.40
Nodes (4): Faithful Refactor, 物理合并 5 步规范, 约束与验证, 零脑补重写与剪贴板优先原则 (Clipboard-First Rule)

### Community 22 - "Install Main Shell Script"
Cohesion: 0.83
Nodes (3): cleanup(), select_menu(), install.sh script

### Community 23 - "Project Handoff Skill"
Cohesion: 0.50
Nodes (3): Guidelines, Handoff Document Structure, Project Handoff

## Knowledge Gaps
- **99 isolated node(s):** `Step 1: 提取流程与架构数据`, `Step 2: 使用 `drawio-skill` 绘制图表`, `1. 动笔前先思考 (Think Before Coding)`, `拒绝为确定性事物写防御性代码`, `拒绝写兜底方案` (+94 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `Step 1: 提取流程与架构数据`, `Step 2: 使用 `drawio-skill` 绘制图表`, `1. 动笔前先思考 (Think Before Coding)` to the rest of the system?**
  _99 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `LLM Wiki Skill & Compiler Module` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `Chrome Pool Python Module` be split into smaller, more focused modules?**
  _Cohesion score 0.14705882352941177 - nodes in this community are weakly interconnected._