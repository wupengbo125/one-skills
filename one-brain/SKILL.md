---
name: one-brain
description: "Use when: 记录/存入知识与记忆，或回忆/查询个人记忆与 Wiki 时使用。"
argument-hint: "recall | remember | lint"
---

# One Brain 统一大脑认知与调度中枢

本技能是个人记忆与知识资产系统的**唯一顶层入口**。自动根据内容属性与用户意图进行智能分流，用户无需关心底层存储细节。

---

## 黄金分流裁决标准（Golden Routing Standard）

| 目标系统 | 判定核心（第一性原理） | 覆盖范围与体量特征 | 底层仓库物理路径 |
| :--- | :--- | :--- | :--- |
| **🧠 个人记忆 (Memory)** | **换个人/换机器就失效的专属私密资产** | • 用户画像 (投资偏好/技术风格)<br>• 交互铁律 (极简、暗号 aaa)<br>• 局域网资产 (10.0.0.10、Omniroute 端口/Token)<br>• 个人踩坑教训与架构决策<br>*(体量：几十行短卡片/断言)* | `~/onespace/github/one-memory/` |
| **📚 深度知识 (Wiki)** | **换个人也完全通用的客观技术与研报** | • 技术工程实战 (Tailscale/Orca/UV/Git)<br>• 金融宏观定价与芯片产业周期<br>• 外部长文/研报深度消化（冷热归档）<br>• 系统架构设计与可视化大屏<br>*(体量：几百~几千字自包含完整文档)* | `~/onespace/github/one-wiki-v2/` |

---

## 核心操作与分级寻路协议

### 1. recall（智能回忆 / 想一下）
当用户说“想一下…”、“回忆一下…”或查询某项内容时，**先审视问题本质，再精准寻路**：

* **识别为【个人/主观/本地资产】**：
  1. 读 `~/onespace/github/one-memory/INDEX.md` 全国总地图；
  2. 进领域地图（如 `memories/system/README.md` 或 `memories/infra/README.md`）；
  3. 读取目标卡片回答。
* **识别为【客观/技术/研报/知识】**：
  1. 读 `~/onespace/github/one-wiki-v2/wiki/INDEX.md` 知识总地图；
  2. 进领域地图（如 `wiki/tech/README.md` 或 `wiki/finance/README.md`）；
  3. 读取目标文档回答（坚决不读 `raw/`）。
* **意图模糊**：并联扫描两边顶层总地图，秒级锁定目标。

---

### 2. remember（智能存入 / 记一下）
当用户说“记一下…”、“把刚才讨论的存入…”时：

1. **内容本质审计（自动纠偏）**：
   * 不论用户口述是“记到记忆”还是“记到 Wiki”，AI 均依据上述黄金标准判断实质；
   * 属于个人偏好/资产/教训 $\longrightarrow$ 睡眠提炼写入 `one-memory/memories/<domain>/` 并更新对应地图；
   * 属于客观技术/研报 $\longrightarrow$ 深度消化写入 `one-wiki-v2/wiki/<domain>/` 并更新对应地图（若有外部原文，同时冷备份至 `raw/<domain>/`）；
2. **自动 Git 同步**：提交并推送到对应远程 GitHub 仓库。

---

### 3. lint（全局认知体检）
校验 `one-memory` 和 `one-wiki-v2` 两大物理仓库所有地图与文档的完整性与连通性。
