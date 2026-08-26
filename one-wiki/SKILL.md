---
name: one-wiki
description: "Use when: 摄入/ingest、query/查询 Wiki、lint Wiki、parse/解析长文档。"
argument-hint: "ingest | query | lint | parse, 以及可选输出语言或问题"
---

# Markdown Wiki

从显式参数或用户意图选择一个操作： ingest（摄入 Markdown 到个人 Wiki）、query（查询个人 Wiki）、lint（检查 Wiki 质量）、parse（解析长文档生成大纲树）。

- 无论调用者的当前目录如何，知识库根目录始终为 `$one_llmwiki_dir/`。
- `ingest` 根据 Wiki 当前状态自动初始化或增量更新。无法判断时只询问操作。
- 每次调用只读取以下两个文件：
| 操作 | 读取文件 |
|---|---|
| `ingest` | `./references/common.md`、`./references/ingest.md` |
| `query` | `./references/common.md`、`./references/query.md` |
| `lint` | `./references/common.md`、`./references/lint.md` |
| `parse` | `./references/common.md`、`./references/parse.md` |

只读取当前操作对应的两个文件，随后直接执行用户当前请求。禁止读取其他操作参考文件。
