---
name: one-code-wiki
description: "Use when: 摄入代码仓库到 Wiki、查询代码 Wiki、检查并修复代码 Wiki 质量。"
argument-hint: "ingest [Wiki brief] | query [问题] | lint"
---

# Code Wiki

从显式参数或用户意图选择一个操作：摄入或维护代码 Wiki 使用 `ingest`，查询代码 Wiki 使用 `query`，健康检查使用 `lint`。无法判断时只询问操作。

每次调用只读取以下两个文件：

| 操作 | 读取文件 |
|---|---|
| `ingest` | `./references/common.md`、`./references/ingest.md` |
| `query` | `./references/common.md`、`./references/query.md` |
| `lint` | `./references/common.md`、`./references/lint.md` |

只加载当前操作对应的两个参考文件，随后直接执行用户当前请求。所选参考文件要求的 Wiki、源码、测试和 Git 证据可照常读取；不读取其他操作参考文件。
