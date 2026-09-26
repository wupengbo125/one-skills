# 记录 (note)

把原始资料丢进 Lore Bloom 收件箱。本地通道：读写 `~/onespace/github/lorebloom`，完成后 commit + push。

## 新资料

1. `git pull`。
2. 写入 `raw/` 根目录。命名：有日期语境用 `YYYY-MM-DD-<slug>.md`，剪藏/文档沿用原文件名；文件名沿用原文语言。
3. 内容保持用户原文。

## 更新收件箱资料

定位 `raw/` 根目录下文件，精准更新。

## 已归档资料

`raw/<领域>/` 下的原文保持原样；补充信息作为新资料丢进 `raw/` 根目录，ingest 时增量合并。

## 完成标准

- 文件落在 `raw/` 根目录，路径已汇报。
- `git push` 成功。
