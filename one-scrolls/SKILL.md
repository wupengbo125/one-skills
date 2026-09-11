---
name: one-scrolls
description: "卷轴体系：查阅、展开与封存低频专用的实操手册/避坑指南/操作卷轴（scrolls）；用户说'查卷轴'、'展开卷轴'、'找避坑指南'、'怎么配置XX'或'封存卷轴'、'记一份卷轴'时触发。"
---

# One Scrolls (卷轴)

低频专用的实操手册与避坑指南，平时卷起封存、不占用常驻上下文，需要时展开，通过 BM25 全文检索或大纲索引精准按需加载。

卷轴库位于 `~/onespace/github/one-skills/scrolls/`

## 意图分流

- **查卷轴 / 展开卷轴 / 搜操作手册 / 查避坑指南**：
  - 用户询问如“怎么配置FRP”、“Tailscale代理怎么设”、“查卷轴”等实操问题；
  - 规则与检索脚本见 [references/search.md](references/search.md)
- **看卷轴大纲 / 浏览卷轴目录**：
  - 直接读取大纲文件：`~/onespace/github/one-skills/scrolls/index.md`
- **封存卷轴（用户说“封存卷轴” / “记一份卷轴” / “创建卷轴”）**：
  - 规则与落盘步骤见 [references/create.md](references/create.md)

## 禁止
- 用户的个人笔记与资料不要存这里——记笔记走 one-wiki 个人笔记本（`one-wiki`）；
- 用户的每日流水与行为偏好不要存这里——个人记忆走 one-memory 海马体（`one-memory`）。
