---
name: one-code-review
description: "审查细则：等号审查 + 4 条坏味道。"
disable-model-invocation: true
---

# One Code-Review

审查只出两个结论，缺一个都不算审完：

- **符合需求吗**：多了（超出需求）/ 少了（需求没做到）/ 需求本身有 bug。
- **质量行不行**：按下 4 条坏味道过一遍 diff。

## 4 条坏味道（从 code-review 的 12 项里挑的，看一个任务的 diff 就判得动）

- **Mysterious Name**：函数/变量/类型的名字看不出干啥 → 改名；起不出诚实的名字说明设计浑。
- **Duplicated Code**：同一段逻辑形状在改动的多个 hunk 或文件里出现 → 提取共用，两边都调它。
- **Feature Envy**：方法用别人的数据比用自己多 → 把方法挪到它羡慕的那个数据上。
- **Middle Man**：类/函数大部分只是往下转发 → 删掉，直接调真身。

四条都是判断题不是硬判；仓库自己的规范优先；lint/format 已能查的不重复查。
