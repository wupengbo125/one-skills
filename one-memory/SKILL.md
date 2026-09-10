---
name: one-memory
description: "海马体记忆系统：管理AI记忆，每日流水与用户偏好，可读写记忆，涉及用户喜好/习惯/历史决策时查用；'收工'兜底补记。记笔记禁用此Skill"
---

# One Memory (海马体记忆系统)

数据仓位于 `~/onespace/github/one-hippocampus/`


## 意图分流

- **查记忆 / 历史流水 / 用户画像 / 查偏好 / 查历史任务**：
  - 用户说法开放（"查记忆"、"找一下之前做了什么"、"查偏好"等皆可），识别意图即可；规则与脚本见 [references/search-memory.md](references/search-memory.md)
- **修改文件/配置后记忆沉淀（自动记忆；"收工"为兜底）**：
  - 规则见 [references/memory.md](references/memory.md)
- **获知用户稳定偏好（自动行为，无需用户开口）**：
  - AI 发现用户表达了新的稳定偏好（如"以后都…""我喜欢…"）时，自动追加 `preference.md`，一条一条，不按天

## 禁止
- 用户说"记笔记"绝对禁止使用这个技能——记笔记走 one-wiki 个人知识库；