---
name: one-md-wiki
description: "Use when: ingest wiki, query wiki, or lint wiki"
argument-hint: "ingest | query | lint, 以及可选输出语言或问题"
---

# Markdown Wiki

从显式参数或用户意图选择一个操作：摄入 Markdown 使用 `ingest`，查询个人 Wiki 使用 `query`，健康检查使用 `lint`。`ingest` 根据 Wiki 当前状态自动初始化或增量更新。无法判断时只询问操作。

每次调用只读取以下两个文件：

| 操作 | 读取文件 |
|---|---|
| `ingest` | `./references/common.md`、`./references/ingest.md` |
| `query` | `./references/common.md`、`./references/query.md` |
| `lint` | `./references/common.md`、`./references/lint.md` |

只读取当前操作对应的两个文件，随后直接执行用户当前请求。禁止读取其他操作参考文件。
