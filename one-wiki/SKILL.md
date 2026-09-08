---
name: one-wiki
description: "记笔记、存资料、总结聊天、更新笔记文档、摄入编译 Wiki、查询 Wiki、巡检 Wiki 质量、或记读书笔记时触发。"
argument-hint: "note | ingest | query | lint, 以及可选内容或问题"
---

# Markdown Wiki

知识库根目录为 `$one_llmwiki_dir/`。

## 意图分流

从用户意图或显式参数选择一个操作，**仅读取对应的一个参考文件**后直接执行：

| 操作 | 说明 | 读取文件 |
| :--- | :--- | :--- |
| `note` | 向 `raw/` 记笔记、存资料、总结对话或更新旧文 | `./references/note.md` |
| `ingest` | 提炼 `raw/` 资料编译入 `onewiki/`（概念、实体与双链） | `./references/ingest.md` |
| `query` | 从 `onewiki/` 检索知识并追溯出处规范页面 | `./references/query.md` |
| `lint` | 检查 `onewiki/` 死链、孤儿页面与冲突矛盾并修复 | `./references/lint.md` |
