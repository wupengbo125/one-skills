---
name: one-super-me
description: "海马体记忆中枢。收工总结、记避坑手册或查系统配置。"
---

# One Super-Me (超级我)：数字化身与记忆中枢

海马体数据仓根目录：`$github_dir/one-hippocampus/`
客户端 CLI 引擎：`super-me`（支持 BM25 检索、增量建库与自清洁）

---

## 意图分流与按需执行路由

为避免大模型一次性加载冗长上下文，本 Skill 采用分层按需引用：

```
                              ┌──────────────────────────────┐
                              │         用户意图输入          │
                              └──────────────┬───────────────┘
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      ▼                                      ▼                                      ▼
【收工 / 下班 / 超级我】             【记一下 / 避坑手册】                 【查配置 / 查历史 / 代号】
读取 references/wrapup.md              读取 references/record.md               直连对应文件或命令执行
沉淀连贯情景记忆至 memory/             分类撰写手册至 onewiki/                 无需加载额外操作文档
```

### 1. 收工链路（随手一句“收工”、“下班”或“超级我”）
- **操作指令**：**立即读取本 Skill 目录下的 `references/wrapup.md` 并遵循执行**。
- **核心逻辑**：防垃圾门禁 $\rightarrow$ 像人类一样记事（不抽碎片，连贯总结写进 `memory/<YYYY-MM-DD_中文主题>.md`） $\rightarrow$ `recent.md` 打卡与自清洁 $\rightarrow$ `super-me sync`。

### 2. 显式记录链路（明确指令“记一下”、“记到文档”、“避坑手册”）
- **操作指令**：**立即读取本 Skill 目录下的 `references/record.md` 并遵循执行**。
- **核心逻辑**：按领域分类写入 `onewiki/<分类>/<全中文名称>.md` $\rightarrow$ 登记 `onewiki/index.md` $\rightarrow$ `super-me sync`。

### 3. 系统查询链路（轻量直查，无需载入子文档）
- **查代号与别名**：直接读取 `system/aliases.md`。
- **查系统环境与硬件**：直接读取 `system/profile.md`。
- **全局历史记忆/踩坑检索**：执行 `super-me search "<检索词>"`（零 Token BM25 秒出）。
