# One Super-Me (超级我)：个人专属数字化身与海马体中枢

One Super-Me 是连接用户个人数字化身（Super-Me）与海马体纯数据仓（`one-hippocampus`）的认知中枢。

---

## 一、 核心架构

```
one-skills/one-super-me/
├── SKILL.md      # 【技能定义】：双模式（显式沉淀 + 无脑收工）与寻路协议
├── README.md     # 【架构与指南】：项目设计与使用说明
└── super-me      # 【统一引擎】：BM25 检索、增量/全量写库、近期记忆治理
```

---

## 二、 双模式沉淀机制 (Dual-Mode Memory Flow)

### 1. 模式一：显式沉淀（明确指令，专项产出）
- **触发词**：“记一下”、“记到海马体”、“沉淀避坑手册”。
- **行为**：Agent 撰写单层平铺中文手册（如 `onewiki/<中文手册名称>.md`），在 `onewiki/index.md` 登记一行。
- **顺便写库**：保存 Markdown 的同时立即调用 `super-me sync "onewiki/<中文手册名称>.md"` 毫秒入库。

### 2. 模式二：无脑收工（零心智负担，宁缺毋滥）
- **触发词**：“**超级我**”、“**收工**”、“**下班**”。
- **心智**：用户不动脑子，会话结束随手甩一句。
- **防垃圾过滤（宁缺毋滥）**：
  - 若本次只是日常寒暄、无硬核改动、无新事实，**严禁制造垃圾**，直接静默退出。
- **四维认知沉淀（有真货才落盘）**：
  - 👤 **画像与偏好 (Profile)** $\rightarrow$ 追加更新 `system/profile.md`
  - 🛠️ **独家操作方法 (Methods)** $\rightarrow$ 写入 `memory/methods/<中文主题>.md`
  - 🗺️ **资产位置与代号 (Locations & Aliases)** $\rightarrow$ 写入 `memory/locations/<中文主题>.md` & `system/aliases.md`
  - ⚡ **核心实操流水 (Recent)** $\rightarrow$ 追加一条到 `recent.md` 表格
- **即时顺便写库**：保存后分别执行 `super-me sync "<相对路径>"` 毫秒更新 BM25 索引库。

---

## 三、 统一客户端命令 (`super-me`)

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

---

## 四、 海马体目录拓扑 (`$github_dir/one-hippocampus`)

```
one-hippocampus/
├── system/
│   ├── profile.md      # 用户静态属性与偏好画像
│   └── aliases.md      # 高频项目代号/别名映射表
├── memory/
│   ├── facts/          # 事实认知（What-is）
│   ├── methods/        # 操作方法与排障踩坑（How-to，100% 中文主题）
│   └── locations/      # 资源与资产位置（Where-is，100% 中文主题）
├── onewiki/
│   ├── index.md        # 单层平铺手册专区总索引
│   └── <中文手册>.md   # 核心系统实操与避坑手册
├── recent.md           # 近期活跃记忆（双阈值治理）
├── hot.md              # 热记忆常驻
└── .fts.db             # SQLite FTS5 本地检索数据库（不进 Git）
```
