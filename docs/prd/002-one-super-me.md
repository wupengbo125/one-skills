---
type: PRD
title: One Super-Me 全新记忆中枢与双通道智能体需求文档
description: 全新重做 One Super-Me 与海马体记忆系统，核心正名：Hook 自动提炼本质为“文档”（操作方法/事物怎么做/在哪里），严禁称作 skill
tags:
  - prd
  - one-super-me
  - memory
  - hippocampus
---

# One Super-Me 全新记忆中枢与双通道智能体需求文档

## 1. 核心原则
- **100% 收敛在 `$github_dir/one-hippocampus/` 内部**，严禁污染个人知识库（如 `one-llmwiki`）。
- **提炼物正名为「文档」，严禁称作「skill」**：自动提炼出的内容本质是指导 AI 办事的文档（操作方法怎么做、事物在哪里、关键事实）。
- 彻底重新设计，清空旧海马体文章与历史规则。
- 全文中文规范。

## 2. 存储与功能架构 (`$github_dir/one-hippocampus/`)
- `hot.md`：热记忆，纯人工手动维护，不限制条数；外部 AI 宿主永远自动装载调用。
- `recent.md`：近期记忆，系统自动更新。双重清理阈值（任一满足即清理）：时间限制 2 个月（60 天），数量限制 100 条。
- `INDEX.md`：海马体总索引，负责冷知识与全部文档导航。
- `memory/`：Hook 自动提炼的「文档」沉淀池（操作方法、资源定位、事实上下文）。
- `onewiki/`：用户主动下令沉淀的长文专区，最外层维护 `index.md` 索引每篇文章功能。
- `system/profile.md`：结构化用户画像（车型油电、GitHub 路径、项目清单、dot five 别名映射）。

## 3. 边界说明
- 需求讨论阶段仅定稿 PRD，不编写实施代码。
