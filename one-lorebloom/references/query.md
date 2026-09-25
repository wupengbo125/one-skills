# 查询 (query)

从知识层 `lorebloom/` 回答问题并追溯原文出处。
仓库：`~/onespace/github/lorebloom/`。

## 手段分流

| 问法 | 手段 |
| :--- | :--- |
| 具体词、原话、人名、术语 | 全文检索：`grep -rn "<关键词>" lorebloom/`（本地无 fts 脚本时用 grep） |
| 某领域有什么、"有没有…相关的" | 从 `lorebloom/index.md` → `lorebloom/<领域>/index.md` 顺双链下钻 |
| 最近、最新、按时间 | 列 `raw/ingested/` 月份目录与 `lorebloom/log.md` |

一条路走空就换下一条，回答里说清走了哪几条。

## 步骤

1. 先 `git pull`，按分流手段定位概念、实体与 summary。
2. 阅读命中页面，沿双链追溯；需要原文时按 summary 头部链接打开 `raw/ingested/YYYY-MM/` 下原文。
3. 基于 `lorebloom/` 内容回答，标明引用页面；区分已查证事实与一方观点。
4. 若产生高价值新结论，建议用户用 `note` 丢进 `raw/` 待摄入。
