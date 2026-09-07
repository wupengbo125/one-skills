# One Free-Me (超级我)：个人专属数字化身与海马体中枢

One Free-Me 是连接用户数字化身与海马体纯数据仓（`one-hippocampus`）的认知与技能中枢。

---

## 一、 技能目录组织 (Directory Layout)

遵循标准 Skill 结构，脚本集中于 `scripts/` 目录下，并提供分层参考指南：

```
one-skills/one-free-me/
├── SKILL.md                 # 【技能核心入口】：意图分流与按需索引
├── scripts/                 # 【脚本目录】
│   └── free_me.py          # BM25 检索、增量/全量建库、近期流水与自清洁
├── references/              # 【按需执行指南】
│   ├── routing.md           # 检索寻路：别名消歧、BM25 检索与语义索引
│   ├── auto-memory.md       # 自动记忆：干活中顺手增量追加到 memory/（主航道）
│   ├── manual-memory.md     # 收工记忆：输入"收工"或"超级我"沉淀到 memory/（兜底）
│   ├── wiki.md              # 实操规程：踩坑实操规程沉淀到 freewiki/（复用资产）
│   └── scripts.md           # 脚本详解与 recent.md 生命周期
├── docs/                    # 【架构与设计资产】
│   ├── architecture.html    # 架构可视化交互图
│   ├── architecture.json    # 架构图配置源码
│   └── PRD.md               # 产品需求文档
└── README.md                # 【说明文档】
```

---

## 二、 核心数据仓设计 (`one-hippocampus`)

数据仓物理分立设计：

1. **`system/`（系统层）**：
   - 静态系统级定义与配置：`constitution.md`（行为规范）、`profile.md`（硬件与用户画像）、`aliases.md`（代号别名）。
2. **`memory/`（情景记忆层）**：
   - 单层平铺存储真实的会话实操、排障复盘与决策长文（如 `memory/<YYYY-MM-DD_中文主题>.md`）。
3. **`freewiki/`（实操规程层）**：
   - 专供本机操作的技能与环境手册，按领域分类（如 `网络/`、`硬件/`、`AI/`），外层由 `index.md` 提供大纲导航。
4. **`recent.md`（近期流水打卡）**：
   - 记录近 60 天或近 100 条流水打卡，支持访问置顶与超额 LRU 自动清理。

---

## 三、 记忆沉淀机制

### 1. 自动记忆（编码产生实质修改时自动落盘）
- 遵循 `references/memory.md`；
- 会话产生实质代码或配置修改时，向当月话题长文 `memory/<YYYY-MM>/<YYYY-MM-DD_中文主题>.md` 记录演化过程；
- 记录改动脉络、关键决策与踩坑，并向当月 `memory/<YYYY-MM>/index.md` 追加流水。

### 2. 收工记忆（用户主动输入“收工”）
- 遵循 `references/memory.md`；
- **价值判定**：会话无实质改动或新增事实时，极简确认后退出；
- **情景复盘**：补全复盘长文，涵盖背景目标、关键决策与落地清单；
- **流水与索引**：向当月 `memory/<YYYY-MM>/index.md` 追加流水，并执行 `scripts/free_me.py sync` 同步索引。


---

## 四、 辅助脚本命令 (`scripts/free_me.py`)

终端可通过 `python3 scripts/free_me.py` 或全局命令 `free-me` 执行：

```bash
# 1. 关键词 BM25 极速检索 (毫秒响应，零 Token 消耗)
python3 scripts/free_me.py search "<关键词>"

# 2. 近期活跃流水打卡与置顶 (自动执行 60 天 / 100 条双阈值淘汰并同步索引)
python3 scripts/free_me.py recent "<实体/主题>" "[指针/简述]"

# 3. 近期记忆治理 (手动执行 60 天 / 100 条双阈值淘汰)
python3 scripts/free_me.py clean

# 4. 增量同步单篇文档索引
python3 scripts/free_me.py sync "<相对路径>"

# 5. 全量重建海马体 .fts.db 索引
python3 scripts/free_me.py rebuild
```
