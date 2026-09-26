# 查询 (query)

从知识层 `lorebloom/` 回答问题并追溯原文。仓库：`~/onespace/github/lorebloom/`。

## 手段

| 问法 | 手段 |
| :--- | :--- |
| 具体词、原话、人名、术语 | `python3 scripts/fts.py search "<关键词>"`（技能同目录脚本，REPO_DIR 指向 lorebloom）；或 `grep -rn` |
| 某领域有什么、相关页面 | `lorebloom/index.md` → 领域 `index.md` → 页面顺双链下钻 |
| 最近、按时间 | `lorebloom/log.md` 与 `raw/<领域>/` 文件名日期 |

一条路走空换下一条，回答里说清走了哪几条。

## 步骤

1. `git pull`，按手段定位概念、实体、项目与 summary。
2. 阅读命中页面，沿双链追溯；需要原文时按 summary 头部链接打开 `raw/<领域>/`。
3. 基于 `lorebloom/` 内容回答，标明引用页面；区分已查证事实与一方观点。
4. 高价值新结论建议用户用 `note` 丢进 `raw/` 待摄入。

## 完成标准

- 回答引用了具体 wiki 页面。
- 涉及原文细节时打开了对应 `raw/<领域>/` 文件核对。
