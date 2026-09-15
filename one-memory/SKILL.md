---
name: one-memory
description: "海马体记忆系统：管理AI记忆（每日流水/用户偏好/行为规则/项目知识），可读写记忆。涉及用户喜好/习惯/历史决策时查用；用户表达行为指令或纠正习惯（'以后都…'、'以后每次…'、'不要再…'、'记住…'、'Always/Never…'）时按范围分流：跨项目、关于用户本人的稳定偏好/画像写入海马体 personal/（追加式偏好进 preferences.md，长期画像整合进 profile.md）；只在某个项目内有效的行为规则/项目知识写入该项目 onememory/rules.md。"
---

# One Memory (海马体记忆系统)

数据仓位于 `~/onespace/github/one-hippocampus/`


## 意图分流

- **查记忆 / 历史流水 / 用户画像 / 查偏好 / 查历史任务**：
  - 用户说法开放（"查记忆"、"找一下之前做了什么"、"查偏好"等皆可），识别意图即可；规则与脚本见 [references/search-memory.md](references/search-memory.md)
- **修改文件/配置后记忆沉淀（自动记忆；"收工"为兜底）**：
  - 规则见 [references/memory.md](references/memory.md)
- **获知用户稳定偏好（自动行为，无需用户开口）**：
  - AI 发现用户表达了新的稳定偏好（如"以后都…""我喜欢…"）时，自动追加 `personal/preferences.md`，一条一条，不按天
  - 分流判定：关于用户本人的稳定偏好/画像 → 海马体 `personal/`（零散偏好追加 `personal/preferences.md`，长期画像整合进 `personal/profile.md`）；只在某个项目内有效的干活规则 → 该项目 `onememory/rules.md`
- **项目级行为规则沉淀（规则轨；每条用户输入都校验，进入项目先读）**：
  - **Every single** user input should be validated against the **trigger conditions**. Once a match is found, **you MUST immediately** check against the exclusion list first. After confirming it is not within the exclusion scope, then update `onememory/rules.md`（当前项目根目录）：
    1. User Provides Explicit Instructions Regarding Behavioral Patterns
    2. User Instructs or Corrects Assistant Behavior
    3. User Expresses Preferred Implementation Methods
    4. User Explains Expected Task Execution Methods
    5. Agent Proactively Discovers Project Knowledge During Task Execution
  - Full rules, exclusion list, examples and file skeleton: [references/rules-memory.md](references/rules-memory.md)
  - If `onememory/rules.md` exists, you **MUST** read it as project-level instructions **before the first reply**; if it does not exist, **when attempting to record content for the first time**, create the file from the **file skeleton** — title line, one-line description, `## Entries` heading — and append the entry to record this time (see [references/rules-memory.md](references/rules-memory.md)).

## 禁止
- 用户说"记笔记"绝对禁止使用这个技能——记笔记走 one-wiki 个人知识库；