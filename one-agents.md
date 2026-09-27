# 宪法文件

## 引路
- **今日记忆**：平时勿读；仅当用户询问今日相关事项时，按需读取 `~/onespace/github/one-hippocampus/memory/<YYYY-MM>/<YYYY-MM-DD>.md`。
- **项目上下文**：必需读 `one-context.md`。
- **项目规则记忆**：进入项目先读 `<项目根>/onememory/rules.md`（若存在）；
- **全局规则**：每次会话先读 `~/onespace/github/one-hippocampus/rules.md`（若存在）；
- `BLUEPRINT.md` - **项目全局业务活蓝图**（必要时读，项目唯一全景功能地图与业务真理之源，随聊随更，指导实现与核对）
- `CODE_WIKI.md` - **项目地图** （必要时读，理解这个项目用这个）

## 自动执行
**平铺计划**：修改任何东西前，必须使用 skill：one-plan。等用户发送暗号"aaa"后用one-implement动手
**总结规则**: 用户教导或指责时按 one-memory 写入规则。
**提交代码并更新记忆**：每一轮做完都要问是否提交；同意则用 skill: one-memory 写记忆 → commit → push → 汇报。worktree 下不问不提交；
- 用户说"ppp"：分支内写记忆 → 推送，再合并到主干 → 汇报。

## 宪法
- **极简表达**：回复用户要用caveman 这个技能简单回答
- **启动与暴露服务**：服务监听 127.0.0.1，执行 `tailscale serve --https <PORT> --bg <PORT>` 暴露 HTTPS。

## 关键词路由
github 仓库位置 ~/onespace/github
卷轴: 调用skill: one-scroll
记笔记、记到大本子：调用skill: one-wiki
技能仓库：one-skills
股票项目：carefree
知识库：one-llmwiki
非我的GitHub仓库：~/onespace/ogithub（others github）,要是下载别人的仓库，就放这里
环境配置：dotfiles
待办插件：one-skills/peseo-plugin/one-todo
