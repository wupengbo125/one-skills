# 查日记

## 点查（"我上次去 X"、"上次什么时候 X"、"那次…"）

```bash
python3 ~/onespace/github/one-life/scripts/fts.py search "五台山"
```

- BM25 返回 Top-5，带日期路径与高亮摘要
- 命中后只读最相关的那 1 个文件，不要全读
- 没命中就换更短的词（1~2 个核心词）再搜一次

## 回顾（"最近干了啥"、"最近怎么样"、"这个月怎么样"）

```bash
python3 ~/onespace/github/one-life/scripts/fts.py recent 7     # 最近 7 天
python3 ~/onespace/github/one-life/scripts/fts.py recent 30    # 最近 30 天
```

按日期倒序输出当天正文（每篇截 400 字）。要细节再打开对应日期文件。

## 新 Agent 上手想了解这个人

按序读，总共不超过几 KB：
1. `~/onespace/github/one-life/INDEX.md`
2. 最近 1~2 篇 `summary/YYYY-MM.md`（月摘要）
3. 年摘要 `summary/YYYY.md`

摘要缺失就先跳过，不要临时去读 365 个日记文件。
