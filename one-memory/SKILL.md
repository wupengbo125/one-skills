---
name: one-memory
description: "海马记忆仓记忆系统：读写 AI 记忆。查记忆、查偏好、查流水、看画像，写流水、记偏好、记规则。涉及用户喜好/习惯/历史决策时查用；用户行为指令、纠正或批评/指责 AI（'以后都…'、'不要再…'、'你怎么又…'、'我说过…'、'不对'）时按范围分流写入对应 rules.md。"
argument-hint: "read-memory | write-memory | write-rules, 以及可选内容"
---

# One Memory (海马记忆仓记忆系统)

数据仓为 GitHub 远端仓库 `wupengbo125/one-hippocampus`（默认分支 main）。
本地克隆路径：`~/onespace/github/one-hippocampus`。

## 意图分流

从用户意图或显式参数选择一个操作，**仅读取对应的一个参考文件**后直接执行：

| 操作 | 说明 | 读取文件 |
| :--- | :--- | :--- |
| `read-memory` / `查记忆` | 查历史流水 / 用户画像 / 查偏好 / 查历史任务 | `./references/read-memory.md` |
| `write-memory` / `沉淀` | 修改文件/配置后流水沉淀；记用户稳定偏好 | `./references/write-memory.md` |
| `write-rules` / `规则` | 用户行为指示、批评/指责 AI 或项目运维/排障知识沉淀 | `./references/rules-memory.md` |

## 禁止
- 用户说"记笔记"绝对禁止使用这个技能——记笔记走 one-wiki 个人知识库；
