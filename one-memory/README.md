# One Free-Me (超级我)：个人专属数字化身与海马体中枢

One Free-Me 是连接用户数字化身与海马体纯数据仓（`one-hippocampus`）的认知与技能中枢。

---

## 一、 技能目录组织 (Directory Layout)

遵循标准 Skill 结构，脚本集中于 `scripts/` 目录下，并提供分层参考指南：

```
one-skills/one-memory/
├── SKILL.md                 # 【技能核心入口】：意图分流与按需索引
├── package.json             # 【Pi 扩展清单】：支持 pi install / pi remove
├── pi-extension/            # 【Pi & OMP 专属扩展层】
│   ├── index.ts             # 扩展入口：常驻规则注入与命令注册
│   └── memory-rules.md      # 动态台词：定义触发/抑制规则（改动实时生效）
├── hooks/                   # 【通用 Git 钩子层】
│   ├── commit-msg           # 提交信息强校验（必须带海马体 hash）
│   ├── install.sh           # 单仓安装脚本
│   ├── post-commit          # 海马体提交自动同步索引
│   └── install-hooks.sh     # 批量分发脚本
├── scripts/                 # 【脚本目录】
│   └── memory.py           # BM25 检索、增量/全量建库、流水与自清洁
├── references/              # 【按需执行指南】
├── docs/                    # 【架构与设计资产】
└── README.md                # 【说明文档】
```

---

## 二、 安装方式 (Installation Modes)

提供两种独立且互不污染的接入方式，可按需组合：

### 1. 模式 A：通用 Git 钩子 (Universal Git Hooks)
- **适用**：任何终端 Git、任何 AI Agent（Claude Code, Cursor, Aider, Pi, OMP 等）。
- **机制**：提交代码时检测海马体更新，超时则输出强系统指令阻止交差。
- **安装**：
  ```bash
  bash one-skills/one-memory/hooks/install-hooks.sh
  ```
- **卸载**：删除对应仓库 `.git/hooks/post-commit`。

### 2. 模式 B：Pi & OMP 原生扩展 (Pi Extension Package)
- **适用**：Pi Coding Agent 与 Oh My Pi。
- **机制**：
  - **动态台词**：每轮前注入 `pi-extension/memory-rules.md`，修改该 MD 文件秒级生效。
  - **命令支持**：提供 `/wrap`（收工沉淀）与 `/memory sync`（索引同步）。
- **安装**：
  ```bash
  pi install /home/ctyun/onespace/github/one-skills/one-memory
  ```
- **卸载**：
  ```bash
  pi remove one-memory
  ```
- **验证**：运行 `pi list` 查看已安装扩展。

---

## 三、 核心数据仓设计 (`one-hippocampus`)

数据仓物理分立设计：

1. **`system/`（系统层）**：
   - 静态系统级定义与配置：`constitution.md`（行为规范）、`profile.md`（硬件与用户画像）、`aliases.md`（代号别名）。
2. **`memory/`（记忆流水层）**：
   - 每日一个文件 `memory/<YYYY-MM>/<YYYY-MM-DD>.md`，豆包式流水（做了什么、结论、待办），按天归档。
3. **`light-skills/`（实操规程层）**：
   - 专供本机操作的技能与环境手册，按领域分类（如 `tech/`、`workflow/`），外层由 `index.md` 提供大纲导航。

---

## 四、 记忆沉淀机制

### 1. 自动记忆（编码产生实质修改时自动落盘）
- 遵循 `references/memory.md`；
- 会话产生实质代码或配置修改时，向当日 `memory/<YYYY-MM>/<YYYY-MM-DD>.md` 追加豆包式流水。

### 2. 收工记忆（用户主动输入“收工”）
- 遵循 `references/memory.md`；
- **价值判定**：会话无实质改动或新增事实时，极简确认后退出；
- **流水沉淀**：向当日 `memory/<YYYY-MM>/<YYYY-MM-DD>.md` 追加豆包式流水；
- **索引同步**：执行 `scripts/memory.py sync` 同步当日文件索引。


---

## 五、 辅助脚本命令 (`scripts/memory.py`)

终端可通过 `python3 scripts/memory.py` 或全局命令 `one-memory` 执行：

```bash
# 1. 关键词 BM25 极速检索 (毫秒响应，零 Token 消耗)
python3 scripts/memory.py search "<关键词>"

# 2. 增量同步索引 (新写/改动文档后同步检索索引)
python3 scripts/memory.py sync "<文档路径>"

# 3. 近期记忆治理 (手动执行 60 天 / 100 条双阈值淘汰)
python3 scripts/memory.py clean

# 4. 增量同步单篇文档索引
python3 scripts/memory.py sync "<相对路径>"

# 5. 全量重建海马体 .fts.db 索引
python3 scripts/memory.py rebuild
```
