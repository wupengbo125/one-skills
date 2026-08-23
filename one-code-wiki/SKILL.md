---
name: one-code-wiki
description: "Use when: ingest代码、查询代码 Wiki、lint wiki。"
argument-hint: "ingest [Wiki 简要说明] | query [问题] | lint"
disable-model-invocation: true
---

# Code Wiki (代码 Wiki 中文版)

从显式参数或用户意图选择一个操作：ingest（摄入代码或维护代码）、query（查询代码 Wiki）、lint（检查 Wiki 质量）。无法判断时只询问操作。

当前仓库为源码根目录，生成文档仅允许保存在 `onewiki/` 目录下。


每次调用只读取以下两个文件：

| 操作 | 读取文件 |
|---|---|
| `ingest` | `./references/common.md`、`./references/ingest.md` |
| `query` | `./references/common.md`、`./references/query.md` |
| `lint` | `./references/common.md`、`./references/lint.md` |

只加载当前操作对应的两个参考文件，随后直接执行用户当前请求。所选参考文件要求的 Wiki、源码、测试和 Git 证据可照常读取；不读取其他操作参考文件。
