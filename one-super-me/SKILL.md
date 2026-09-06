---
name: one-super-me
description: "海马体记忆中枢。自动记忆、手工收工、避坑手册与系统速查。"
---

# One Super-Me (超级我)：数字化身与记忆中枢

海马体数据仓根目录：`$github_dir/one-hippocampus/`
客户端 CLI 引擎：`super-me`（支持 BM25 检索、增量建库与自清洁）

---

## 意图分流与按需执行路由

为避免大模型一次性加载冗长上下文，本 Skill 采用分层按需引用：

```
                              ┌──────────────────────────────┐
                              │         用户意图 / 行为       │
                              └──────────────┬───────────────┘
                                             │
      ┌───────────────────────┬──────────────┴───────────────┬───────────────────────┐
      ▼                       ▼                              ▼                       ▼
【自动记忆 (主航道)】     【手工记忆 (收工/复盘)】       【避坑手册 (记一下)】    【查配置 / 查历史】
读取 auto-memory.md       读取 manual-memory.md          读取 wiki.md            直连对应文件或命令
增量追加至 memory/        全局沉淀至 memory/             分类撰写至 onewiki/     无需加载额外文档
```

### 1. 自动记忆（会话全程自主生效，主航道）
- **操作指令**：产生实质改动时，遵循本 Skill 目录下的 `references/auto-memory.md` 执行。
- **核心逻辑**：一个话题对应 `memory/` 一个文件与 `recent.md` 一条指针；随推进增量追加记录，不依赖收工触发。

### 2. 手工记忆（随手一句“收工”、“下班”、“总结一下”或“超级我”）
- **操作指令**：**立即读取本 Skill 目录下的 `references/manual-memory.md` 并遵循执行**。
- **核心逻辑**：防垃圾门禁 $\rightarrow$ 像人类一样记事（不抽碎片，连贯总结写进 `memory/<YYYY-MM-DD_中文主题>.md`） $\rightarrow$ `recent.md` 打卡与自清洁 $\rightarrow$ `super-me sync`。若自动记忆已完整覆盖，仅极简确认即可。

### 3. 避坑手册（明确指令“记一下”、“记到文档”、“避坑手册”）
- **操作指令**：**立即读取本 Skill 目录下的 `references/wiki.md` 并遵循执行**。
- **核心逻辑**：按领域分类写入 `onewiki/<分类>/<全中文名称>.md` $\rightarrow$ 登记 `onewiki/index.md` $\rightarrow$ `super-me sync`。

### 4. 系统查询链路（轻量直查，无需载入子文档）
- **查代号与别名**：直接读取 `system/aliases.md`。
- **查系统环境与硬件**：直接读取 `system/profile.md`。
- **全局历史记忆/踩坑检索**：执行 `super-me search "<检索词>"`（零 Token BM25 秒出）。
