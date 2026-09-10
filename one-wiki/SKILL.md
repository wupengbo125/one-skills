---
name: one-wiki
description: "记笔记、记到大本子、更新笔记、查询笔记，ingest，lint触发。"
argument-hint: "note | ingest | query | lint, 以及可选内容或问题"
---

# Markdown Wiki

知识库根目录为 `~/onespace/github/one-llmwiki`。

## 意图分流

从用户意图或显式参数选择一个操作，**仅读取对应的一个参考文件**后直接执行：

| 操作 | 说明 | 读取文件 |
| :--- | :--- | :--- |
| `note` | 向 `raw/` 记笔记、存资料、或更新笔记、记到大本子| `./references/note.md` |
| `ingest` | 提炼 `raw/` 资料编译入 `onewiki/`| `./references/ingest.md` |
| `query` | 从 `onewiki/` 检索知识并追溯出处规范页面 | `./references/query.md` |
| `lint` | 检查 `onewiki/` 死链、孤儿页面与冲突矛盾并修复 | `./references/lint.md` |
