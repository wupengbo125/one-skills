---
name: one-ebbiii
description: 当用户提到艾宾浩斯的时候触发
---
# ebbiii 闪卡

把对话里的知识点沉淀为问答卡片，存入 ebbiii 艾宾浩斯复习系统。

## 规则

1. 每张卡 = 一个 `question` + 一个 `answer`。
2. answer 不超过 200 字，只留核心骨架。
3. 加重要卡片前先 `GET /api/v1/cards?q=<关键词>` 查重。

## 执行

提取 1 个精准问题 + 精简解答后，按 [references/api.md](references/api.md) 的 curl 调 `POST /api/v1/cards`。

成功只回一句：「✓ 已添加：[问题摘要]」。
