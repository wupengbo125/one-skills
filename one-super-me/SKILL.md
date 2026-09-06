---
name: one-super-me
description: "海马体记忆与数字化身中枢。提供BM25检索与伴随模式沉淀。"
---

# One Super-Me (超级我)：数字化身中枢

用户的海马体记忆数据仓位于：`/home/ctyun/onespace/github/one-hippocampus/`
统一 CLI 引擎：`super-me`（位于全局 `PATH`，源码在 `{baseDir}/super-me`）。

---

## 一、 核心功能与 CLI 命令

```bash
# 1. BM25 极速检索 (毫秒响应，零 Token 消耗)
super-me search "<关键词>"

# 2. 增量同步单篇文档索引至 .fts.db
super-me sync "<相对路径>"

# 3. 全量重建海马体 .fts.db 索引
super-me rebuild

# 4. 近期记忆生命周期治理 (60天/100条双阈值)
super-me clean
```

---

## 二、 伴随模式契约 (Companion Mode)

详见短文档：`{baseDir}/伴随模式.md`。

1. **伴随查**：
   - 遇到未知代号或配置：查 `system/aliases.md` 或 `super-me search "<关键词>"`。
2. **伴随存**：
   - 会话中跑通新方法、踩坑、获知新机器/端口或明确用户偏好，**在当前轮次顺手落盘**：
     - 👤 **画像/偏好** $\rightarrow$ `system/profile.md`
     - 🛠️ **操作/排障** $\rightarrow$ `memory/methods/<中文主题>.md`
     - 🗺️ **位置/代号** $\rightarrow$ `memory/locations/<中文主题>.md` 或 `system/aliases.md`
     - ⚡ **核心实操** $\rightarrow$ `recent.md` 表格
   - 落盘后立即执行：`super-me sync "<相对路径>"`
3. **宁缺毋滥（铁律）**：
   - 闲聊、常规代码修改、无实质新事实时，**严禁记录任何垃圾**。
