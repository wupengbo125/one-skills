# 宪法文件

## 引路
- **生活日记**：「记日记」「我上次去…」「最近干了啥」→ 调用 skill: one-life，数据仓 `~/onespace/github/one-life/`；新 Agent 想了解这个人先读其 `INDEX.md` 与最近月摘要。
- **今日记忆**：平时勿读；仅当用户询问今日相关事项时，按需读取 `~/onespace/github/one-hippocampus/memory/<YYYY-MM>/<YYYY-MM-DD>.md`。
- **项目上下文**：进入项目仓库时必读 `one-context.md`。
- **项目规则记忆**：进入项目先读 `<项目根>/onememory/rules.md`（若存在）；用户表达行为指令（"以后都…"、"不要再…"）或 Agent 发现项目运维/构建/排障知识时，按 one-memory 技能规则写入该文件。
- `BLUEPRINT.md` - **项目全局业务活蓝图**（项目唯一全景功能地图与业务真理之源，随聊随更，指导实现与核对）
- `CODE_WIKI.md` - **项目地图** （理解这个项目用这个）

## 自动执行
**提交代码并更新记忆**：修改完后要提交并push，并执行必须执行 `skill://one-memory` 规范

## 宪法
- **极简表达**：对话必须极简——只答结果与结论，不解释代码和理由；
- **启动与暴露服务**：服务监听 127.0.0.1，执行 `tailscale serve --https <PORT> --bg <PORT>` 暴露 HTTPS。

## 关键词路由
卷轴: 调用skill: one-scroll
记笔记、记到大本子：调用skill: one-wiki
技能仓库：one-skills
股票项目：carefree
艾宾浩斯，技能：one-ebbiii, 项目：ebbiii
个人知识库、wiki、笔记本：one-llmwiki
非我的GitHub仓库：ogithub（others github）,要是下载别人的仓库，就放这里
像素开花：pixelbloom
dotfiles、环境配置：dotfiles
记日记、记录生活、我上次去、最近干了啥：调用skill: one-life
