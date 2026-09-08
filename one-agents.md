# AI Coding Agents

- **行为宪法**：行为准则与交互底线严格执行 `~/onespace/github/one-hippocampus/system/constitution.md`。
- **全局热记忆**：不清楚用户的专有知识读这个 `~/onespace/github/one-hippocampus/hot.md`
- **今日记忆**：平时勿读；仅当用户询问今日相关事项时，按需读取 `~/onespace/github/one-hippocampus/memory/<YYYY-MM>/<YYYY-MM-DD>.md`。
- **项目上下文**：涉及本仓库知识或修改本仓库时读 `one-context.md`。
- **自动记忆**：修改任何文件后必须自动记录流水至海马体。提交顺序强制：①先提交海马体拿 commit hash；②再提交代码仓库，message 带 `[memory: <hash>]`。pre-commit hook 验证 hash，未通过拒绝提交。
- **自检**：动手前检查 constitution.md、hot.md 是否读了；修改任何文件后检查 memory.md 是否遵守了。没读或没遵守就是失败，立刻补。

- `CONTEXT.md` - **领域模型与术语词汇表**（DDD 统一语言与业务概念定义）。
- `docs/adr/` - 架构决策记录
- `BLUEPRINT.md`（或 `docs/BLUEPRINT.md`） - **项目全局业务活蓝图**（项目唯一全景功能地图与业务真理之源，随聊随更，指导实现与核对）

