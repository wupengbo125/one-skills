---
name: one-memory
description: "海马记忆仓记忆系统：管理AI记忆（每日流水/用户偏好/行为规则/项目知识），可读写记忆。涉及用户喜好/习惯/历史决策时查用；用户表达行为指令或纠正习惯（'以后都…'、'以后每次…'、'不要再…'、'记住…'、'Always/Never…'）时按范围分流：跨项目、关于用户本人的稳定偏好/画像写入海马记忆仓 personal/（追加式偏好进 preferences.md，长期画像整合进 profile.md）；只在某个项目内有效的行为规则/项目知识写入该项目 onememory/rules.md。"
argument-hint: "read-memory | write-memory | write-rules, 以及可选内容"
---

# One Memory (海马记忆仓记忆系统)

数据仓为 GitHub 远端仓库 `wupengbo125/one-hippocampus`（默认分支 main）。
本地克隆路径：`~/onespace/github/one-hippocampus`。

**硬约束**：不按 write-memory 规范写记忆（缺时间/缺会话ID/同ID多行/漏落海马仓），提交会被仓库 pre-commit 钩子拦截，必须修正后重提。

## 意图分流

从用户意图或显式参数选择一个操作，**仅读取对应的一个参考文件**后直接执行：

| 操作 | 说明 | 读取文件 |
| :--- | :--- | :--- |
| `read-memory` / `查记忆` | 查历史流水 / 用户画像 / 查偏好 / 查历史任务 | `./references/read-memory.md` |
| `write-memory` / `沉淀` | 修改文件/配置后流水沉淀；记用户稳定偏好 | `./references/write-memory.md` |
| `write-rules` / `规则` | 用户行为指示或项目运维/排障知识沉淀 | `./references/rules-memory.md` |

## 禁止
- 用户说"记笔记"绝对禁止使用这个技能——记笔记走 one-wiki 个人知识库；
