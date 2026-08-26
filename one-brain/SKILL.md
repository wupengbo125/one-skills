---
name: one-brain
description: "Use when: 记录/存入知识与记忆，或回忆/查询个人记忆与 Wiki 时使用。"
argument-hint: "recall | remember | lint"
---

# One Brain 统一大脑认知与路由网关

作为个人记忆与知识资产的唯一顶层入口，实现**“存储物理隔离，调用无感统合”**。

---

## 黄金分流原则（Golden Routing Rule）

| 存储目标 | 判定标准 | 核心覆盖范围 | 物理仓库路径 |
| :--- | :--- | :--- | :--- |
| **🧠 个人记忆 (one-memory)** | **换个人/换机器就用不了的专属资产** | • 用户画像与投资关注点<br>• 交互铁律 (极简、暗号 aaa)<br>• 局域网 IP、Omniroute 端口与 Token<br>• 跨会话踩坑教训与个人决策 | `~/onespace/github/one-memory/` |
| **📚 深度知识 (one-wiki-v2)** | **换个人也完全通用的客观技术与研报** | • 深度技术实战 (Tailscale/Orca/UV)<br>• 金融宏观定价与大宗芯片周期<br>• 外部好文章深度消化与冷热归档<br>• 系统架构与可视化工程 | `~/onespace/github/one-wiki-v2/` |

---

## 核心操作与执行协议

### 1. recall（智能回忆 / 想一下）
当用户说“想一下…”、“回忆一下…”、“查一下…”时，**自动识别意图并路由**：
* **问自我、偏好或本地资产**（如“我的暗号规则”、“本地 AI 代理端口”） $\longrightarrow$ 走 `one-memory` 分级地图寻路；
* **问客观技术、宏观原理或文章**（如“原油怎么传导到A股”、“Tailscale配置”） $\longrightarrow$ 走 `one-wiki-v2` 分级地图寻路；
* **意图模糊** $\longrightarrow$ 并联扫描 `one-memory/INDEX.md` 与 `one-wiki-v2/wiki/INDEX.md` 两张总地图，秒级锁定目标。

---

### 2. remember（智能存入 / 记一下）
当用户说“记一下这个…”、“把刚才讨论的存下来…”时：
1. **自动判定归属**：
   * 提炼出属于【个人偏好/本地配置/踩坑教训】 $\longrightarrow$ 存入 `one-memory` 对应卡片并更新地图；
   * 提炼出属于【通用技术实战/宏观逻辑/研报长文】 $\longrightarrow$ 存入 `one-wiki-v2` 对应目录并更新地图；
2. **自动 Git 同步**：提交并推送到对应远程仓库。

---

### 3. lint（全局认知巡检）
统一检查 `one-memory` 和 `one-wiki-v2` 两大物理仓库的地图与文档完整性。
