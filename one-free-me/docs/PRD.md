---
type: PRD
title: One Free-Me 记忆中枢与执行代理需求文档
description: "海马体记忆中枢与数字化身规范文档 (PRD)"
tags:
  - prd
  - one-free-me
  - memory
  - hippocampus
---

# One Free-Me 记忆中枢与执行代理需求文档

## 1. 核心设计原则

1. **全量记忆为主，近期查询为客**：每日文件 `memory/<YYYY-MM>/<YYYY-MM-DD>.md` 全量流水，永不淘汰；仅当用户主动询问近期历史时 `ls` 当月文件按需查阅。
2. **常驻感知轻量化**：大模型动笔前仅读 `hot.md`（全局路由与关键硬核上下文），彻底消除默认冗余读取。
3. **用户画像闭环**：涉及用户个人身份、偏好、习惯或选型时，主动读取 `system/profile.md`；获知新事实时顺手更新。
4. **命名规范**：系统骨架目录 100% 英文小写，具体文档与文章文件名 100% 中文。
5. **本地全文检索**：由 `scripts/free_me.py` 提供毫秒级 BM25 检索。

---

## 2. 存储拓扑 (`$github_dir/one-hippocampus/`)

```
$github_dir/one-hippocampus/
├── .gitignore               # 忽略本地 .fts.db
├── .fts.db                  # 本地 BM25 检索数据库
├── INDEX.md                 # 海马体总索引
├── hot.md                   # 全局热记忆（大模型动笔前必读）
├── system/                  # 系统级基准与配置
│   ├── constitution.md      # 行为宪法
│   ├── profile.md           # 用户画像（身份、习惯、喜好与软硬件环境）
│   └── aliases.md           # 项目代号与路径映射
├── memory/                  # 每日流水（按月分目录）
│   └── YYYY-MM/             # 月份目录
│       └── YYYY-MM-DD.md    # 当日豆包式流水
└── light-skills/                 # 领域实操避坑规程库
    ├── index.md             # 规程总大纲
    └── <英文分类>/          # 如 network/, hardware/, workflow/
        ├── index.md         # 分类目录大纲
        └── <中文主题>.md     # 实操规程文档
```

---

## 3. 记忆生命周期

### 3.1 记忆沉淀（自动记忆 / 手动收工）
* **触发时机**：日常推进产生实质代码或配置修改，或用户输入“收工”。

* **行为**：
  1. 价值判定（无实质增量则不写，手动触发时直接回复已完成）；
  2. 追加豆包式流水段至当日 `memory/<YYYY-MM>/<YYYY-MM-DD>.md`（做了什么、关键结论、待办，不记过程）；
  3. 获知用户新事实时顺手更新 `system/profile.md`；
  4. 同步索引：`python3 scripts/free_me.py sync "<改动的文件路径>"`；
  5. 提交 git。

### 3.2 创建轻 Skill（“创建轻 Skill”）
* **触发时机**：用户输入“创建轻 Skill”或“创建冷门技能”。
* **行为**：
  1. 沉淀实操规程至 `light-skills/<英文分类>/<中文主题>.md`；
  2. 更新对应索引（`light-skills/index.md`）；
  3. 同步索引：`python3 scripts/free_me.py sync "<改动的文件路径>"`；
  4. 提交 git。

---

## 4. 检索与消费优先级

1. **用户画像感知**：涉及个人身份、偏好、习惯或软硬件环境，直接读取 `system/profile.md`；
2. **近期历史查阅**：用户主动询问最近干了什么，`ls memory/<YYYY-MM>/` 列当月文件，按需读取对应日文件；
3. **BM25 检索**：查资料统一先搜 `python3 scripts/free_me.py search "<关键词>"`；
4. **分类导航与归档**：未命中时查阅 `light-skills/index.md`，或 `ls memory/<YYYY-MM>/`。

---

## 5. 辅助脚本 (`scripts/free_me.py`)

| 子命令 | 参数 | 说明 | 调用示例 |
| :--- | :--- | :--- | :--- |
| `search` | `<关键词>` | BM25 本地检索海马体文档与高亮片段。 | `python3 scripts/free_me.py search "Tailscale"` |
| `sync` | `<相对路径>` | 将单篇 Markdown 增量写入 `.fts.db` 索引。 | `python3 scripts/free_me.py sync "memory/2026-09/2026-09-07.md"` |
| `rebuild` | 无 | 全量扫描海马体重建 `.fts.db`。 | `python3 scripts/free_me.py rebuild` |
