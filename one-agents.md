# AI Coding Agents

- **行为宪法**：行为准则与交互底线严格执行 `~/onespace/github/one-hippocampus/system/constitution.md`（中文交互、动笔前先思考、本地 commit 不 push、极简答复）。
- **全局热记忆**：动笔与分析前，必读海马体 `~/onespace/github/one-hippocampus/hot.md`（所有全局路由、动态知识与资产以此为准）。

<!-- PROJECT-NAV:START -->

## Project Navigation (项目导航)

在开始分析或编码前，先执行以下一行命令快速盘点当前项目实际存在的导航文件：

```bash
ls -d one-context.md CONTEXT.md .agents/rules/*.md rules/*.md onewiki/index.md docs/adr docs/prd 2>/dev/null
```

根据上述命令的实际输出，**仅读取确认存在的文件**（严禁盲读不存在的文件）：

- `one-context.md` - **项目全景总纲与上下文**。包含项目是什么、核心业务规则、代码结构地图、雷区避坑与运行指南（优先读这个）。
- `CONTEXT.md` - **领域模型与术语词汇表**（DDD 统一语言与业务概念定义）。
- `docs/adr/` - 架构决策记录
- `docs/prd/` - 当前需求与实现计划
<!-- PROJECT-NAV:END -->
