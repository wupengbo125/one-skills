# One Super-Me (超级我)：个人专属数字化身与海马体中枢

One Super-Me 是连接用户数字化身与海马体纯数据仓（`one-hippocampus`）的认知与技能中枢。

---

## 一、 技能分层架构 (Layered Architecture)

为了避免大模型一次性加载全部长篇规范导致上下文膨胀，Skill 采用分层路由架构：

```
one-skills/one-super-me/
├── SKILL.md                 # 【轻量路由入口】：意图分流与按需引用声明
├── super-me                 # 【统一引擎】：BM25 检索、增量/全量建库、近期记忆治理
├── references/              # 【按需执行指南】：三大动作各司其职
│   ├── auto-memory.md       # 自动记忆：干活中顺手增量追加到 memory/（主航道）
│   ├── manual-memory.md     # 手工记忆：收工/超级我沉淀到 memory/（兜底）
│   └── wiki.md              # 避坑手册：领域分类操作规程沉淀到 onewiki/
├── docs/                    # 【架构与设计资产】
│   ├── architecture.html    # 架构可视化交互图
│   ├── architecture.json    # 架构图配置源码
│   └── PRD.md               # 产品需求文档
└── README.md                # 【说明文档】
```

---

## 二、 核心数据仓设计 (`one-hippocampus`)

数据仓物理三权分立，彻底告别实体碎片化抽取的死结：

1. **`system/`（系统层）**：
   - 静态系统级定义与法则：`constitution.md`（行为宪法）、`profile.md`（硬件与用户画像）、`aliases.md`（代号别名）。
2. **`memory/`（情景记忆层）**：
   - **像人类一样记事**：单层平铺存储真实的会话实操、排障复盘与决策长文（如 `memory/<YYYY-MM-DD_中文主题>.md`）。拒绝切碎抽取零散实体。
3. **`onewiki/`（私有 Skill 手册层）**：
   - 专供 AI 操作本机的独家技能避坑手册库，按领域分类（如 `网络/`、`硬件/`、`AI/`），外层由 `index.md` 提供完整技能大纲。
4. **`recent.md`（近期流水打卡）**：
   - 记录近 60 天或近 100 条流水打卡，超额 LRU 自动清理。

---

## 三、 记忆沉淀机制

### 1. 自动记忆（会话进行时，主航道）
- 遵循 `references/auto-memory.md`；
- 会话产生实质改动时，向当日话题长文 `memory/<YYYY-MM-DD_中文主题>.md` 增量追加演化过程；
- 一个话题对应 `recent.md` 一条记录与 `memory/` 一个文件，不依赖收工触发。

### 2. 手工记忆（用户主动输入“收工” / “超级我”）
- 遵循 `references/manual-memory.md`；
- **防垃圾门禁**：无重大决策与新工程事实时，0 文件落盘，极简退出；
- **情景记忆复盘**：若自动记忆已覆盖，极简确认；未覆盖则补全复盘长文；
- **打卡与自清洁**：更新 `recent.md`，执行 `super-me clean` 与 `super-me sync`。

### 3. 避坑手册（用户说“记一下 / 记到文档 / 避坑手册”）
- 遵循 `references/wiki.md`；
- 按领域分类撰写中文手册至 `onewiki/<分类>/<全中文名称>.md`；
- 在 `onewiki/index.md` 对应领域下登记并执行 `super-me sync`。

---

## 四、 统一客户端命令 (`super-me`)

```bash
# 1. 关键词 BM25 极速检索 (毫秒响应，零 Token 消耗)
super-me search "<关键词>"

# 2. 增量同步单篇文档索引
super-me sync "<相对路径>"

# 3. 全量重建海马体 .fts.db 索引
super-me rebuild

# 4. 近期记忆治理 (双阈值 60 天 / 100 条淘汰)
super-me clean
```
