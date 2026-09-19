# One Free-Me (超级我)：个人专属数字化身与海马记忆仓中枢

One Free-Me 是连接用户数字化身与海马记忆仓纯数据仓（`one-hippocampus`）的认知与技能中枢。

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
├── hooks/ 【通用 Git 钩子层】
│   ├── pre-commit 代码改动与 onememory/ 原子提交门禁 + 海马摘要等号校验
│   ├── post-commit 海马记忆仓提交自动同步索引
│   └── install-hook.sh 钩子分发脚本
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
- **适用**：任何终端 Git、任何 Agent（Claude Code, Cursor, Aider, Pi, OMP 等）。
- **机制**：提交代码时检测 `onememory/` 随身记忆，并校验海马记忆仓当日摘要与 `timeline.md` 末行一致；海马记忆仓提交后自动同步检索索引。
- **安装**：
  ```bash
  bash one-skills/one-memory/hooks/install-hook.sh
  ```
- **卸载**：删除对应仓库 `.git/hooks/pre-commit` 或 `.git/hooks/post-commit`。
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

1. **`personal/`（个人层）**：
   - 个人画像：`personal/profile.md`（用户身份、信仰、健康、车辆、出行等）。
   - 追加式偏好：`personal/preferences.md`（跨项目个人稳定偏好，一条一条追加）。
2. **`memory/`（记忆流水层）**：
   - 每日一个文件 `memory/<YYYY-MM>/<YYYY-MM-DD>.md`，豆包式流水（做了什么、结论、待办），按天归档。
3. **`scrolls/`（卷轴/实操规程层）**：
   - 专供本机操作的技能与环境手册，按领域分类（如 `tech/`、`workflow/`），外层由 `index.md` 提供大纲导航。

---

## 四、 记忆沉淀机制（三轨）

### 1. 自动记忆（编码产生实质修改时自动落盘）
- 规则见 `references/write-memory.md`
- 会话产生实质代码或配置修改时，向当日 `memory/<YYYY-MM>/<YYYY-MM-DD>.md` 追加豆包式流水。

### 2. 收工记忆（用户主动输入“收工”）
- 规则见 `references/write-memory.md`
- **价值判定**：会话无实质改动或新增事实时，极简确认后退出；
- **流水沉淀**：向当日 `memory/<YYYY-MM>/<YYYY-MM-DD>.md` 追加豆包式流水；
- **索引同步**：执行 `scripts/fts.py sync` 同步当日文件索引。

### 3. 规则记忆（规则轨，写入项目 `onememory/rules.md`）
- 遵循 `references/rules-memory.md`；
- **触发**：用户教导行为模式 / 纠正助手行为 / 表达偏好实现方式，或 Agent 在构建/测试/调试/部署中发现项目知识时；
- **边界**：只记"怎么做"（行为规则），不记"做了什么"（落入事实轨 tasks/ 案卷）；跨项目个人偏好走海马记忆仓 `personal/preferences.md`；
- **治理**：单文件上限 150 行，超限同类合并；改动与代码同批提交，不参与门禁强校验；
- **读取**：进入项目首次回复前，若存在 `onememory/rules.md` 必须先读，作为项目级指令。


---

## 五、 辅助脚本命令 (`scripts/fts.py`)

终端可通过 `python3 scripts/fts.py` 或全局命令 `one-memory` 执行：

```bash
# 1. 关键词 BM25 极速检索 (毫秒响应，零 Token 消耗)
python3 scripts/fts.py search "<关键词>"

# 2. 增量同步索引 (新写/改动文档后同步检索索引)
python3 scripts/fts.py sync "<文档路径>"

# 3. 近期记忆治理 (手动执行 60 天 / 100 条双阈值淘汰)
python3 scripts/fts.py clean

# 4. 增量同步单篇文档索引
python3 scripts/fts.py sync "<相对路径>"

# 5. 全量重建海马记忆仓 .fts.db 索引
python3 scripts/fts.py rebuild
```
