---
name: one-lorebloom
description: "Lore Bloom 知识库：随手丢原始资料、摄入自动整理、查询笔记、校验，ingest/lint 触发。"
argument-hint: "note | ingest | query | lint, 以及可选内容或问题"
---

# Lore Bloom 知识库

GitHub 远端仓库 `wupengbo125/lorebloom`（私有，分支 main）。
本地克隆路径：`~/onespace/github/lorebloom`。
**仓库根目录 `AGENTS.md` 是权威操作规则**，与本技能冲突时以 AGENTS.md 为准。

## 三层结构

- `raw/` 根目录：收件箱，原始资料随手丢，不分类、不改写。
- `raw/ingested/YYYY-MM/`：已摄入原文归档，按月份。
- `lorebloom/`：AI 维护的知识层，按领域分 `<领域>/{summaries,concepts,entities}/`；领域：life、mindset、technology、stocks、personal、food、english。

## 意图分流

从用户意图或显式参数选择一个操作，**仅读取对应的一个参考文件**后直接执行：

| 操作 | 说明 | 读取文件 |
| :--- | :--- | :--- |
| `note` | 把原始资料丢进 `raw/` 根目录，或更新已有资料 | `./references/note.md` |
| `ingest` | 扫描 `raw/` 根目录，编译入 `lorebloom/`，原文按月归档 | `./references/ingest.md` |
| `query` | 从 `lorebloom/` 检索知识并追溯原文出处 | `./references/query.md` |
| `lint` | 检查 `lorebloom/` 死链、孤儿页面与矛盾并修复 | `./references/lint.md` |
