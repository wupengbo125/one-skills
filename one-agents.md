# 宪法文件

## 引路
- **今日记忆**：平时勿读；仅当用户询问今日相关事项时，按需读取 `~/onespace/github/one-hippocampus/memory/<YYYY-MM>/<YYYY-MM-DD>.md`。
- **项目上下文**：必需读 `one-context.md`。

## 暗号（只有用户说了下面的指定词才做对应操作，用户没说，禁止自主执行）
- 修改任何内容必须等用户发送暗号"aaa"，用户本轮没说"aaa"，绝对禁止修改文件
- 当用户说"cm",则必须用 /skill:one-memory 写记忆 → commit → push → 汇报。
- 当用户说"ppp"：分支内写记忆 → 合并到主干 → 汇报。

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
