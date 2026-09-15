---
name: one-life
description: "生活日记：「记日记」「记录生活」「今天…」写入 one-life；「我上次去…」「最近干了啥」查询。"
---

# One Life (个人生活日记)

数据仓位于 `~/onespace/github/one-life/`

## 意图分流

- **记日记 / 记录生活 / 「今天…」「昨天…」「去了…」「吃了…」「买了…」「见了…」**：
  - 按 [references/write.md](references/write.md) 追加到当日文件并提交推送
- **查「我上次去 X」「上次什么时候 X」**：
  - `python3 ~/onespace/github/one-life/scripts/life.py search "<关键词>"`
- **回顾「最近干了啥」「最近怎么样」**：
  - `python3 ~/onespace/github/one-life/scripts/life.py recent 7`
- **整理 / 月末回顾 / 蒸馏**：
  - 规则见 [references/distill.md](references/distill.md)

## 边界（防止误触发，必读）

[references/boundary.md](references/boundary.md) —— 三问定仓：AI 干了什么活 → 海马体；可复用知识/读书笔记 → one-llmwiki；**我这个人的经历** → one-life。

## 禁止

- 用户说"记笔记""记到大本子" → 走 one-wiki，不用这个技能
- 改完代码沉淀改动 → 走 one-memory，不用这个技能
