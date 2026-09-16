---
name: one-memory
description: "海马体记忆系统：管理AI记忆（每日流水/用户偏好/行为规则/项目知识），可读写记忆。涉及用户喜好/习惯/历史决策时查用；用户表达行为指令或纠正习惯（'以后都…'、'以后每次…'、'不要再…'、'记住…'、'Always/Never…'）时按范围分流：跨项目、关于用户本人的稳定偏好/画像写入海马体 personal/（追加式偏好进 preferences.md，长期画像整合进 profile.md）；只在某个项目内有效的行为规则/项目知识写入该项目 onememory/rules.md。"
argument-hint: "查记忆 | 沉淀 | 偏好, 以及可选内容"
---

# One Memory (海马体记忆系统)

数据仓为 GitHub 远端仓库 `wupengbo125/one-hippocampus`（默认分支 main）。
本地克隆路径：`~/onespace/github/one-hippocampus`。

## 意图分流

从用户意图或显式参数选择一个操作，**仅读取对应的一个参考文件**后直接执行：

| 操作 | 说明 | 读取文件 |
| :--- | :--- | :--- |
| `查记忆` | 查历史流水 / 用户画像 / 查偏好 / 查历史任务 | `./references/search-memory.md` |
| `沉淀` | 修改文件/配置后记忆沉淀（自动记忆；"收工"为兜底） | `./references/memory.md` |
| `偏好` | 获知用户稳定偏好，追加 `personal/preferences.md` / 更新 `profile.md` | `./references/memory.md` |

## 禁止
- 用户说"记笔记"绝对禁止使用这个技能——记笔记走 one-wiki 个人知识库；
