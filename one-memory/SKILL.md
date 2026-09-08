---
name: one-memory
description: "海马体记忆系统：管理每日流水与用户偏好（memory/preference/task，可读写，涉及用户喜好/习惯/历史决策时查用）；提交代码强制先写记忆——commit-msg hook 验证代码仓库提交必须带 [memory: <hash>]，hash 需存在于海马体；'收工'兜底补记。"
---

# One Memory (海马体记忆系统)

数据仓位于 `~/onespace/github/one-hippocampus/`

记忆分**三态（对齐豆包）**：
- **daily（每日流水）**：`memory/<YYYY-MM>/<YYYY-MM-DD>.md`，每天一个文件，记当天做了什么 + 结论 + 待办。
- **preference（偏好）**：`preference.md`，获知用户稳定偏好（回复风格、习惯、喜好）时追加或更新，一条一条不按天。
- **task（任务）**：`tasks/<taskID>.md`，task ID=会话 ID，每会话一个文件，写流水时自动更新过程摘要。

格式与写入步骤见 [references/memory.md](references/memory.md)。

两套 git hook：
- **commit-msg（强制）**：代码仓库提交必须带 `[memory: <hash>]`，hash 需存在于海马体，否则拒绝。安装：`bash ~/onespace/github/one-skills/hooks/install.sh`
- **post-commit（索引同步）**：海马体仓库提交后自动同步检索索引。安装：`bash hooks/install-hooks.sh`

## 意图分流

- **查记忆 / 历史流水 / 用户画像 / 查偏好 / 查历史任务**：
  - 用户说法开放（"查记忆"、"找一下之前做了什么"、"查偏好"等皆可），识别意图即可；规则与脚本见 [references/search-memory.md](references/search-memory.md)
- **修改代码/配置后记忆沉淀（自动记忆；"收工"为兜底——仅当自动记忆遗漏时用户才会说）**：
  - 规则见 [references/memory.md](references/memory.md)
- **获知用户稳定偏好（自动行为，无需用户开口）**：
  - AI 发现用户表达了新的稳定偏好（如"以后都…""我喜欢…"）时，自动追加 `preference.md`，一条一条，不按天
- **写流水时自动更新 task（自动行为）**：
  - 用当前会话 ID 作为 task ID，检查 `tasks/<taskID>.md` 是否存在，存在则更新过程摘要，不存在则新建。

## 禁止
- 用户说"记笔记"不要用这个技能——记笔记走 one-wiki 个人知识库；
- 低频实操手册与避坑指南走 one-light-skills 技能库；本技能只管海马体个人记忆流水与画像。