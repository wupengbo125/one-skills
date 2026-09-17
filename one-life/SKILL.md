---
name: one-life
description: "生活日记：「记录生活」查生活日记。"
---

# One Life (个人生活日记)

数据仓位于 `~/onespace/github/one-life/`

## 铁律
更新生活日记仓库，一定要先从远端同步仓库，然后修改，最后再提交并推送，并必须汇报已推送。

## 意图分流

- **记日记 / 记录生活 / 「今天…」「昨天…」「去了…」「吃了…」「买了…」「见了…」**：
  - 按 [references/write.md](references/write.md) 追加到当日文件并提交推送
- **查生活日记「我上次去 X」「上次什么时候 X」**：
  - `python3 ~/onespace/github/one-life/scripts/fts.py search "<关键词>"`
- **回顾「最近干了啥」「最近怎么样」**：
  - `python3 ~/onespace/github/one-life/scripts/fts.py recent 7`
- **整理 / 月末回顾 / 蒸馏**：
  - 规则见 [references/distill.md](references/distill.md)

## 禁止

- 用户说"记笔记""记到大本子" → 走 one-wiki，不用这个技能
- 改完代码沉淀改动 → 走 one-memory，不用这个技能
