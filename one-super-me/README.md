# One Super-Me (超级我)：个人专属数字化身与海马体中枢

One Super-Me 是连接用户数字化身与海马体纯数据仓（`one-hippocampus`）的认知与技能中枢。

---

## 一、 技能分层架构 (Layered Architecture)

为了避免大模型一次性加载全部长篇规范导致上下文膨胀，Skill 采用分层路由架构：

```
one-skills/one-super-me/
├── SKILL.md                 # 【轻量路由入口】：意图分流与按需引用声明（~40行）
├── references/
│   ├── wrapup.md            # 【收工操作文档】：防垃圾门禁、情景记忆连贯沉淀、自清洁
│   └── record.md            # 【手册操作文档】：单层平铺避坑长文撰写、索引登记
├── README.md                # 【架构与使用说明】
└── super-me                 # 【统一引擎】：BM25 检索、增量/全量建库、近期记忆治理
```

---

## 二、 核心数据仓设计 (`one-hippocampus`)

数据仓物理三权分立，彻底告别实体碎片化抽取的死结：

1. **`system/`（系统层）**：
   - 静态系统级定义与法则：`constitution.md`（行为宪法）、`profile.md`（硬件与用户画像）、`aliases.md`（代号别名）。
2. **`memory/`（情景记忆层）**：
   - **像人类一样记事**：单层平铺存储真实的会话实操、排障复盘与决策长文（如 `memory/<YYYY-MM-DD_中文主题>.md`）。拒绝切碎抽取零散实体。
3. **`onewiki/`（避坑技能层）**：
   - 独立避坑实操手册专区（专供 AI 操作用户电脑的独家避坑指南），单层平铺，外层 `index.md` 索引。
4. **`recent.md`（近期流水打卡）**：
   - 记录近 60 天或近 100 条流水打卡，超额 LRU 自动清理。

---

## 三、 双模式沉淀机制 (Dual-Mode Flow)

### 1. 显式记录链路（用户说“记一下 / 记到文档 / 避坑手册”）
- 按需加载并遵循 `references/record.md`；
- 撰写单层平铺中文长文至 `onewiki/<全中文名称>.md`；
- 在 `onewiki/index.md` 登记一行并执行 `super-me sync`。

### 2. 无脑收工链路（用户随手说“收工 / 下班 / 超级我”）
- 按需加载并遵循 `references/wrapup.md`；
- **防垃圾门禁**：无重大决策与新工程事实时，0 文件落盘，极简退出；
- **情景记忆落地**：撰写完整复盘长文至 `memory/<YYYY-MM-DD_中文主题>.md`；
- **打卡与自清洁**：在 `recent.md` 追加打卡，执行 `super-me clean` 与 `super-me sync`。

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
