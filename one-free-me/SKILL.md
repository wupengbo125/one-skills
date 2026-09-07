---
name: one-free-me
description: "记忆与轻Skill：自动沉淀记忆流水；用户想查记忆/查资料/看轻Skill内容时检索；用户说'创建轻Skill'或'创建冷门技能'时创建轻Skill；'收工'为兜底补记。"
---

# One Free-Me (解脱我)

数据仓位于 `~/onespace/github/one-hippocampus/`

记忆分**三态（对齐豆包）**：
- **daily（每日流水）**：`memory/<YYYY-MM>/<YYYY-MM-DD>.md`，每天一个文件，记当天做了什么 + 结论 + 待办。
- **preference（偏好）**：`preference.md`，获知用户稳定偏好（回复风格、习惯、喜好）时追加或更新，一条一条不按天。
- **task_history（任务）**：`task_history.md`，完成有长期价值的关键任务后追加"做了什么 + 结论"，一条一条不按天。

格式与写入步骤见 [references/memory.md](references/memory.md)。

轻 Skill = 低频使用的专用技能文档（"轻"指使用频度，不是内容轻重）。

记忆提醒钩子：`bash hooks/install-hooks.sh` 一键安装 post-commit 提醒到 one-skills 与 one-hippocampus（云电脑重装后需重跑）。

## 意图分流

- **查记忆 / 查资料 / 历史流水 / 用户画像 / 查偏好 / 查任务 / 看轻 Skill 内容**：
  - 用户说法开放（"查记忆"、"找一下"、"看看轻Skill里有什么"等皆可），识别意图即可；规则与脚本见 [references/search-memory.md](references/search-memory.md)
- **修改东西后记忆沉淀（自动记忆；"收工"为兜底——仅当自动记忆失败时用户才会说）**：

  - 规则见 [references/memory.md](references/memory.md)
- **获知用户稳定偏好（自动行为，无需用户开口）**：
  - AI 发现用户表达了新的稳定偏好（如"以后都…""我喜欢…"）时，自动追加 `preference.md`，一条一条，不按天
- **完成有长期价值的关键任务后（自动行为）**：
  - 自动追加 `task_history.md`，一条"做了什么 + 结论"
- **创建轻 Skill（用户说“创建轻 Skill” / “创建冷门技能”）**：
  - 内容写入 light-skills，规则见 [references/light-skills.md](references/light-skills.md)

## 禁止
- 用户说"记笔记"不要用这个技能——记笔记走 one-wiki 个人笔记本；本技能只管记忆流水（memory/）与轻 Skill（light-skills/）