# Google OKF 规范模板与参考示例

## 1. 全局索引模板 (`index.md`)

```markdown
---
type: index
title: Wiki 索引白名单
updated_at: "2026-08-11"
---

# Wiki 索引白名单

## Summaries
- [[summaries/transformer-paper]]

## Concepts
- [[concepts/self-attention]]
- [[concepts/multi-head-attention]]

## Entities
- [[entities/google-brain]]
```

---

## 2. 概念页面模板 (`concepts/<slug>.md`)

```markdown
---
title: 自注意力机制
type: concept
description: 允许序列中的不同位置相互计算注意力权重的机制
created_at: "2026-08-11"
updated_at: "2026-08-11"
---

# 自注意力机制

自注意力机制（Self-Attention）是现代大语言模型的基础架构...

## 核心要点
- 通过 Query, Key, Value 矩阵进行权重计算
- 与多头注意力机制相结合：[[concepts/multi-head-attention]]

## 相关来源
- 论文摘要：[[summaries/transformer-paper]]
- 研发机构：[[entities/google-brain]]
```

---

## 3. 实体页面模板 (`entities/<slug>.md`)

```markdown
---
title: Google Brain
type: entity
entity_type: organization
description: Alphabet 旗下研究前沿深度学习技术的团队
created_at: "2026-08-11"
updated_at: "2026-08-11"
---


