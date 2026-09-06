---
type: PRD
title: One Super-Me 全新记忆中枢与双通道智能体需求文档
description: 全新重做 One Super-Me 与海马体记忆系统，规范中文文章命名、扁平化 onewiki 私有实操手册与双通道记忆机制
tags:
  - prd
  - one-super-me
  - memory
  - hippocampus
---

# One Super-Me 全新记忆中枢与双通道智能体需求文档

## 1. 核心原则
- **100% 收敛在 `$github_dir/one-hippocampus/` 内部**，严禁污染个人知识库（如 `one-llmwiki`）。
- **文章命名全中文**：系统骨架（`INDEX.md`、`hot.md`、`recent.md` 等）英文，所有具体文档与文章文件名必须 100% 使用中文（如《某软件本地安装终极避坑手册.md》）。
- **onewiki 单层平铺**：不设二级分类目录，专供“AI 操作我电脑的独家实操避坑手册”（环境资产、本地私有操作、踩坑跑通路线），外层 `index.md` 统一登记。
- **提炼物正名为「文档」，严禁称作「skill」**：提炼操作方法（怎么做）、资源定位（在哪里）、关键事实。
- 全文中文规范，清空旧海马体文章。

## 2. 存储与功能架构 (`$github_dir/one-hippocampus/`)
- `hot.md`：热记忆，纯人工手动维护，不限制条数；外部 AI 宿主永远自动装载调用。
- `recent.md`：近期记忆，系统自动更新。双重清理阈值（任一满足即清理）：时间限制 2 个月（60 天），数量限制 100 条。
- `INDEX.md`：海马体总索引，负责冷知识与全部文档导航。
- `memory/`：Hook 自动提炼的「文档」沉淀池，按中文主题文件聚合（操作方法、资源定位、事实上下文）。
- `onewiki/`：单层扁平专区，存放独家实操避坑手册，外层 `index.md` 索引每篇手册。
- `system/`：拆分为 `profile.md`（静态画像）与 `aliases.md`（高频项目别名映射，如 `dot five`）。

## 3. 边界说明
- 需求讨论阶段仅定稿 PRD 与文档，不编写实施代码。
