---
name: one-wiki
description: "Use when: 记笔记、存资料、总结聊天、更新笔记/文档、摄入/ingest、query/查询 Wiki、lint Wiki，或触发词 qqq/Qqq、take notes、summarize chat、update notes。"
argument-hint: "note | ingest | query | lint, 以及可选内容或问题"
---

# Markdown Wiki

从显式参数或用户意图选择一个操作：
- `note`：向 raw 收件箱记笔记、存资料、总结当前对话，或检索更新已有旧文档。
- `ingest`：摄入并编译 Markdown 到个人 Wiki（细粒度摘要、概念、实体与双链）。
- `query`：查询个人 Wiki 并追溯规范页面。
- `lint`：检查 Wiki 质量、孤立页面与死链并修复。


- 无论调用者的当前目录如何，知识库根目录始终为 `$one_llmwiki_dir/`。
- `ingest` 根据 Wiki 当前状态自动初始化或增量更新。无法判断时只询问操作。
- 每次调用只读取以下两个文件：
| 操作 | 读取文件 |
|---|---|
| `note` | `./references/common.md`、`./references/note.md` |
| `ingest` | `./references/common.md`、`./references/ingest.md` |
| `query` | `./references/common.md`、`./references/query.md` |
| `lint` | `./references/common.md`、`./references/lint.md` |


只读取当前操作对应的两个文件，随后直接执行用户当前请求。禁止读取其他操作参考文件。

