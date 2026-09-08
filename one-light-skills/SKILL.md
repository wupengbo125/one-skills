---
name: one-light-skills
description: "轻Skill体系：查阅、检索与创建低频专用技能/避坑手册/操作指南（light-skills）；用户说'查轻Skill'、'找避坑指南'、'怎么配置XX'或'创建轻Skill'、'创建冷门技能'时触发。"
---

# One Light-Skills (轻技能)

低频专用的实操手册与避坑指南，平时不占用常驻上下文，需要时通过 BM25 全文检索或大纲索引精准按需加载。

数据仓位于 `~/onespace/github/one-skills/light-skills/`

## 意图分流

- **查轻 Skill / 搜操作手册 / 查避坑指南**：
  - 用户询问如“怎么配置FRP”、“Tailscale代理怎么设”、“查轻Skill”等实操问题；
  - 规则与检索脚本见 [references/search.md](references/search.md)
- **看轻 Skill 大纲 / 浏览清单**：
  - 直接读取大纲文件：`~/onespace/github/one-skills/light-skills/index.md`
- **创建轻 Skill（用户说“创建轻 Skill” / “创建冷门技能”）**：
  - 规则与落盘步骤见 [references/create.md](references/create.md)

## 禁止
- 用户的个人笔记与资料不要存这里——记笔记走 one-wiki 个人笔记本（`one-llmwiki`）；
- 用户的每日流水与行为偏好不要存这里——个人记忆走 one-memory 海马体（`one-hippocampus`）。
