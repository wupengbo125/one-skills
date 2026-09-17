# one-skills Code Wiki

供 AI 快速定位：是什么、在哪、怎么跑、有什么坑。叙述性解释一律省略。

## 1. 项目事实

- 个人 Agent 技能库 + 全局 Agent 规则源仓库。12 个自研技能，每个技能 = 一个 `one-*` 目录 + 标准 `SKILL.md`（agentskills.io 规范）。
- 本仓库是唯一源。严禁修改安装目标目录（`./.agents/skills/`、`~/.agents/skills/`、各宿主配置文件）；改技能只改本仓库源目录。
- [one-agents.md](file:///home/ctyun/onespace/github/one-skills/one-agents.md) 是全局宪法唯一源，由 install.sh 分发软链到各宿主；改规则只改它。
- 检索栈：Python 标准库 + SQLite FTS5（WAL + `unicode61` + BM25），索引文件统一为 `<数据仓>/.fts.db`（git 忽略）。
- 硬约束：禁止外部分词库（jieba 等）、禁止常驻守护进程、禁止引入旧名兼容（`light-skills` / `one-light-skills` / `light_skills.py` / `ONE_LIGHT_SKILLS_DIR` 均不存在）。
- 无测试、无第三方依赖（Python 零 pip、TS 扩展零 npm）。

## 2. 目录地图

```
one-skills/
├── one-agents.md            # 全局宪法源（分发目标见 §8）
├── BLUEPRINT.md             # 本仓业务活蓝图
├── one-context.md           # 本仓给 AI 的规则（源规范声明）
├── skills-lock.json         # npx skills 锁文件（含已删除技能的残留记录）
├── install.sh               # 交互式分发：软链技能/宪法、卸载、装记忆钩子
├── install-others.sh        # 第三方技能/工具批量安装
├── one-wiki/                # 个人知识库：SKILL.md + references/{note,ingest,query,lint}.md + scripts/wiki.py
├── one-memory/     海马体记忆：SKILL.md references/{read-memory,write-memory,rules-memory}.md scripts/memory.py hooks/ pi-extension/
├── one-life/                # 生活日记：SKILL.md + references/{write,search,distill,boundary}.md（脚本在 one-life 仓 scripts/life.py）
├── one-scrolls/             # 卷轴库：SKILL.md + references/{search,create}.md + scripts/scrolls.py + scrolls/（自带数据）
├── one-harness/             # 重型开发流程（禁自动触发）：SKILL.md + references/python-structure.md
├── one-harness-lite/      轻量开发流程：SKILL.md + pi-extension/index.ts + package.json（Pi 扩展）
├── one-implement/ 极简实现流程：SKILL.md pi-extension/index.ts package.json（Pi 扩展）
├── one-blueprint/           # 业务蓝图：SKILL.md + BLUEPRINT-TEMPLATE.md
├── one-context/             # 项目上下文：SKILL.md + CONTEXT-TEMPLATE.md
├── one-refactor-implement-cp/  # 物理剪贴重构（禁自动触发）
├── one-handoff/             # 会话交接（禁自动触发）
├── one-ebbiii/              # 艾宾浩斯闪卡 API
├── one-book-notes/          # 读书笔记路由
├── one-awesome-design/      # UI 设计规范：SKILL.md + reference/apple-design.md
├── onememory/               # 本仓自己的项目随身记忆（timeline.md + tasks/<会话ID>.md）
└── .pi/skills/caveman/      # vendored 第三方技能
```

外部数据仓（不在本仓）：

- `~/onespace/github/one-llmwiki/`：wiki 数据。`raw/` 原始材料，`onewiki/` 编译知识库（summaries/concepts/entities 三层 + Obsidian 双链）。
- `~/onespace/github/one-hippocampus/`：记忆中枢。`memory/<YYYY-MM>/<YYYY-MM-DD>.md` 每日流水、`personal/preferences.md` 偏好、`personal/profile.md` 画像。
- `one-scrolls/scrolls/`：卷轴数据随本技能分发，`tech/`、`mindset/` 分类 + `index.md` 大纲。

## 3. 技能清单

| 技能 | 触发方式 | 职责 | 数据/依赖 |
| :-- | :-- | :-- | :-- |
| one-wiki | 自动："记笔记/记到大本子/ingest/lint" | raw 记录、ingest 编译、query 检索、lint 巡检 | one-llmwiki 仓；"记笔记"禁用 one-memory |
| one-memory | 自动："查记忆/查偏好"；"收工"兜底；`/wrap` | 双轨记忆读写与检索 | one-hippocampus 仓 + 各项目 `onememory/` |
| one-life | 自动："记日记/记录生活/我上次去…/最近干了啥" | 个人生活日记（情景记忆）写入、检索、月年蒸馏 | one-life 私有仓（diary/ summary/ entities/） |
| one-scrolls | 自动："查卷轴/避坑指南/封存卷轴" | 低频实操手册封存与检索 | 自带 scrolls/；个人笔记/记忆禁存这里 |
| one-blueprint | 自动：蓝图维护/核对 | 维护项目唯一 `BLUEPRINT.md`（只写业务逻辑，不写 UI） | 被 one-harness 作基准 |
| one-context | 自动：init/update | 生成/更新根目录 `CONTEXT.md`，绝不覆盖人工背景 | 模板 CONTEXT-TEMPLATE.md |
| one-harness | 仅显式调用 | 重型流程：主 Agent 只架构，Worker 写码+同步蓝图，双轴审查（Standards/Spec），交付闸门写记忆 | 引用 one-blueprint、one-memory、code-review |
| one-harness-lite | 自动（改文件即触发；已用重型则跳过） | 主 Agent 自己改，改完不 commit，派无记忆 Sub-agent 拿原话+`git diff HEAD`等号审查 | Pi 扩展自动注入 |
| one-implement | 自动（改文件即触发） | 平铺计划，最小化实现，严防多改，改完不 commit，对照需求做等号审查 | 扩展自动注入 |
| one-refactor-implement-cp | 仅显式调用 | 重构禁凭记忆重打代码：`cp`/`sed` 物理复制，5 步法 | 前置遵循 one-harness |
| one-handoff | 仅显式调用 | 生成覆盖式 `handoff.md`，脱敏 | 引用 BLUEPRINT/git diff |
| one-ebbiii | 自动："艾宾浩斯" | 闪卡 CRUD：`Bearer $EBBIII_API_TOKEN`，答案 ≤200 字，先查重 | HTTP `${EBBIII_BASE_URL:-http://localhost:3000}/api/v1/cards` |
| one-book-notes | 自动："记到《书名》" | 追加 `## YYYY-MM-DD` 到固定文件并 git push | one-llmwiki/raw |
| one-awesome-design | 自动：UI 设计 | 按 reference/ 规范实现（现仅 apple-design.md） | — |

意图分流模式：SKILL.md 只做路由表，命中后 Agent 只读对应的一个 `references/*.md` 再执行。

## 4. 检索 CLI（三脚本同构，函数式无类）

共同行为：无子命令/未识别命令处理、缺 `.fts.db` 时首次 search 自动全量建库、输出 Top-N 带 `【】` 高亮摘要与 BM25 评分。

| | [wiki.py](file:///home/ctyun/onespace/github/one-skills/one-wiki/scripts/wiki.py) | [memory.py](file:///home/ctyun/onespace/github/one-skills/one-memory/scripts/memory.py) | [scrolls.py](file:///home/ctyun/onespace/github/one-skills/one-scrolls/scripts/scrolls.py) |
| :-- | :-- | :-- | :-- |
| 数据仓 | `ONE_LLMWIKI_DIR` 或向上查 `onewiki/` | `ONE_HIPPOCAMPUS_DIR` 或 `~/onespace/github/one-hippocampus` | `ONE_SCROLLS_DIR` 或脚本旁 `../scrolls` |
| 表结构 | `docs_fts(path UNINDEXED, title, category, content)` + `file_meta(path, mtime)` | 7 列：`path/raw_title/raw_content UNINDEXED, title, category, content, anchor`；无 file_meta | 同 memory.py |
| 索引粒度 | 一文件一行 | 一锚点/列表项一行（`##`/`###` 为 anchor，`- **名称**：内容` 提名称） | 同 memory.py |
| 分词 | 索引期正则展开 CJK 1/2-gram（"量化投资"→`量 量化 化 化投 投 投资 资`），西文放行 unicode61 | 同左 | 手写字符扫描版，英文串切分小写 |
| 查询构造 | token 全 OR | 中文段内 OR、段间 AND（高精度） | 全 OR；英文加 `*` 前缀（高召回） |
| 特有机制 | `ensure_synced()`：每次 search 前按 mtime JIT 增量自愈（新增/变更重索引，删除自动清理），无需 sync | rebuild 只收顶层 `memory/`、`system/` | rebuild 收全部 .md 含 index.md |
| Top-N | 10 | 5 | 5 |

命令（三者一致）：

```bash
python3 <脚本> search "<关键词>"   # 检索
python3 <脚本> sync "<相对路径>"   # 单篇同步；文件已删则移出索引
python3 <脚本> rebuild             # 全量重建（先删 db/-wal/-shm）
```

- wiki.py 未识别命令隐式按 search；scrolls.py 仅认 search/sync/rebuild 小写命令。
- sync 是显式义务：改动 md 后必须 `sync`，memory 另有 post-commit 钩子兜底。

## 5. one-memory 记忆机制

- 双轨：项目随身记忆 `<项目>/onememory/timeline.md`（单文件流水）+ `onememory/tasks/<会话ID>.md`（案卷），与代码**同批原子提交**；全局中枢 one-hippocampus 只单向记账 `- HH:mm [~/项目路径] [会话ID] 摘要`。摘要"单次生成，双处落盘"。
- hooks：
  - `hooks/pre-commit`：暂存区有非 onememory/ 改动却无 onememory/ 文件 → 拒绝提交（`--no-verify` 可绕过）。
  - `hooks/post-commit`：仅 one-hippocampus 仓提交时，对本 diff 的 .md 逐个 `memory.py sync`（静默）。
- Pi 扩展 `pi-extension/index.ts`：`before_agent_start` 每轮热注入 memory-rules.md + 会话 ID；命令 `/wrap`（收工沉淀）、`/memory sync`（rebuild）。
- SOP：查资料第一步必跑 BM25，只精读命中 1~2 篇；查今日流水/偏好/画像/任务案卷走直达路径（见 references/read-memory.md）。

## 6. one-wiki 四操作要点

- note：条目模式写 `raw/misc/大本子.md`（按 `## 小节` 归类，不新建文件）；文档模式写 `raw/<YYYY-MM-DD>-<slug>.md`；更新前先 search 定位。
- ingest：源文件移入 `raw/<topic>/`（文件名保持原语言），三层萃取到 `onewiki/summaries|concepts|entities/`，跨域双链，更新 `onewiki/index.md` 与 `log.md`，最后 sync。
- query：先 BM25，再沿双链精读，回答标注出处。
- lint：查死链/孤儿页/矛盾/概念缺口，确认后修复并记 log。

## 7. 扩展接口（三个 index.ts 文件同构）
仅用 `node:fs/promises`、`node:path`、`node:url`，TS 由 Pi 宿主直接加载，无构建步骤。API：`pi.on(event, handler)`、`pi.registerCommand(name, {description, handler})`、`pi.sendUserMessage(msg, {deliverAs})`、`pi.exec(cmd, args)`；事件：`before_agent_start`（改 systemPrompt）、`tool_call`、`tool_result`（可追加 content 文本）。

- one-memory：注入 memory-rules.md；`/wrap`、`/memory sync`。
- one-harness-lite：注入去 Frontmatter SKILL.md；edit/write tool_call 通知、tool_result 追加审查提醒（禁止直接 commit，强制 Sub-agent 等号审查）；`/harness` 状态命令。
- one-implement：注入去 Frontmatter SKILL.md；edit/write tool_call 通知、tool_result 追加极简实现提醒（平铺计划、最小化实现、严防多改、强制等号审查）；`/implement` 状态命令。

## 8. 分发与安装

```bash
# 远程（无需克隆）
npx -y skills@latest add https://github.com/wupengbo125/one-skills --skill one-memory [-g]

# 本地
bash install.sh          # 多选技能 → 单选操作：软链/卸载到 ./.agents/skills 或 ~/.agents/skills；装记忆钩子
bash install-others.sh   # 第三方生态

# Pi 包
pi install /home/ctyun/onespace/github/one-skills/one-memory   # 或 -l 局部
pi remove one-memory && pi list
```

- install.sh 软链在 Windows 退化为 PowerShell 硬链接。
- 宪法 one-agents.md 全局分发 11 处：`~/.pi/agent/`、`~/.gemini/config/`、`~/.gemini/GEMINI.md`、`~/.claude/CLAUDE.md`、`~/.cursor/`、`~/.config/opencode/`、`~/.copilot/`、`~/.agents/`、`~/.trae-cn/user_rules/`、`~/.codebuddy/rules/AGENTS.md`、`~/.qoder-cn/AGENTS.md`；项目级分发为 `./AGENTS.md`、`./CLAUDE.md`。
- 装记忆钩子时跳过 one-hippocampus（其记忆目录是 memory/ 不是 onememory/，门禁会拦死自身提交）。

## 9. 环境变量

| 变量 | 默认 | 消费者 |
| :-- | :-- | :-- |
| `ONE_LLMWIKI_DIR` | 向上查 onewiki/ | wiki.py |
| `ONE_HIPPOCAMPUS_DIR` | `~/onespace/github/one-hippocampus` | memory.py |
| `ONE_SCROLLS_DIR` | `<skill>/one-scrolls/scrolls` | scrolls.py |
| `EBBIII_API_TOKEN` | 必填 | one-ebbiii |
| `EBBIII_BASE_URL` | `http://localhost:3000` | one-ebbiii |

## 10. 事实陷阱（AI 必读）

1. one-memory/README.md 过期：其中 `memory.py clean` 命令不存在；`commit-msg` 哈希校验钩子已废弃（install.sh 会删除它）；hippocampus 的 scrolls/ 层已独立为 one-scrolls。
2. skills-lock.json 残留 4 个已删除技能：one-code-wiki、one-summarize-chat、one-take-notes、one-update-notes。
3. 仓库根 `scrolls/.fts.db` 是改名遗留物（真实索引在 `one-scrolls/scrolls/.fts.db`），可删。
4. scrolls.py 的 `bm25` 只传 4 个权重而表有 7 列，title 无加权（memory.py 有 5.0）；如需加权改传 7 个。
5. one-wiki/references/ingest.md 中 `[[ORCA_RICH_MD:...]]` 是平台替换残留，实际路径为 `onewiki/<topic>/index.md`。
6. memory.py 与 scrolls.py 的 `resolve_rel_path/parse_entries/insert_entries/make_clean_snippet` 是同源复制（技能自包含设计，未抽公共包），改一处需同步另一处。
7. 索引产物 `.fts.db` 及 `__pycache__/` 被 git 忽略，不要提交。
