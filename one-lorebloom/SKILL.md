---
name: one-lorebloom
description: "Lore Bloom 知识库：丢原始资料、摄入编译、查询、校验，ingest/lint 触发。"
argument-hint: "note | ingest | query | lint, 以及可选内容或问题"
---

# Lore Bloom 知识库

GitHub 远端 `wupengbo125/lorebloom`（私有，main）。本地 `~/onespace/github/lorebloom`。

## 引导词：compiler

把 wiki 当编译器：`raw/` 是源码，ingest 是编译，`lorebloom/` 是成品，lint 是测试。成品承载全部有价值信息，编译后基本不再翻源码。

## 结构

```
raw/                  根目录散文件 = 待摄入收件箱
raw/<领域>/           进了领域目录 = 已摄入归档（life/study/food/technology/stocks）
lorebloom/<领域>/     知识层，每领域下：
  concepts/           可复用方法论、跨资料出现的思维模型
  entities/           外部对象：人物、工具、产品、地点、食材、项目
  summaries/          每份原文一对一完整浓缩
  index.md
lorebloom/index.md    总索引
lorebloom/log.md      全库流水
```

## 意图分流

| 操作 | 说明 | 读取文件 |
| :--- | :--- | :--- |
| `note` | 原始资料丢进 raw 根目录 | `./references/note.md` |
| `ingest` | 扫描 raw 根目录，编译入 lorebloom，原文移进对应领域目录 | `./references/ingest.md` |
| `query` | 从 lorebloom 检索并追溯原文 | `./references/query.md` |
| `lint` | 校验死链、薄页面、孤儿、矛盾 | `./references/lint.md` |
