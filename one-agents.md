# 宪法文件

## 引路
- **全局热记忆（热记忆）**：不清楚用户的专有知识读这个 `~/onespace/github/one-hippocampus/hot-memory.md`；用户提到"热记忆"时主动读取。
- **今日记忆**：平时勿读；仅当用户询问今日相关事项时，按需读取 `~/onespace/github/one-hippocampus/memory/<YYYY-MM>/<YYYY-MM-DD>.md`。
- **项目上下文**：进入项目仓库时必读 `one-context.md`。
- **项目规则记忆**：进入项目先读 `<项目根>/onememory/rules.md`（若存在）；用户表达行为指令（"以后都…"、"不要再…"）或 Agent 发现项目运维/构建/排障知识时，按 one-memory 技能规则写入该文件。
- `BLUEPRINT.md` - **项目全局业务活蓝图**（项目唯一全景功能地图与业务真理之源，随聊随更，指导实现与核对）
- `CODE_WIKI.md` - **项目地图** （理解这个项目用这个）

## 宪法
- **本地提交与随身记忆**：修改任何业务代码或文件，必须严格执行 `skill://one-memory` 规范
- **极简表达**：对话必须极简——只答结果与结论，不解释代码和理由；能用一句话回答绝不用长篇大论，达意即可。
- 改任何东西前，必须先读 `~/onespace/github/one-skills/one-harness/SKILL.md`，按它的规则来。
- **启动与暴露服务**：服务监听 127.0.0.1，执行 `tailscale serve --https <PORT> --bg <PORT>` 暴露 HTTPS。

## 关键词路由
卷轴: 调用skill: one-scroll
记笔记、记到大本子：调用skill: one-wiki
