# 记录 (note)

把原始资料丢进 Lore Bloom 收件箱。
**本地通道**：直接读写本地仓库 `~/onespace/github/lorebloom`，完成后 commit + push。

## 1. 新资料（剪藏 / 随笔 / 文档 / 语音转写）

1. **拉取最新**：`cd ~/onespace/github/lorebloom && git pull`
2. **直接落盘**：写入 `raw/` 根目录（**不建任何子目录、不分类**），命名：
   - 有日期语境：`raw/YYYY-MM-DD-<简短slug>.md`
   - 剪藏/文档：沿用原文件名
   - 文件名沿用原文语言，不翻译、不机械转 kebab-case
3. 内容保持用户原文，不整理不加工。

## 2. 更新收件箱中已有资料

定位 `raw/` 根目录下文件，精准更新原文。

## 3. 更新已摄入的原文

已归档到 `raw/ingested/` 的原文**不再修改**；如需补充新信息，作为新资料丢进 `raw/` 根目录，ingest 时增量合并到知识页。

## 完成

```bash
cd ~/onespace/github/lorebloom && git add -A && git commit -m "note: <简述>" && git push
```

汇报落盘路径，提示用户可随时 ingest。
