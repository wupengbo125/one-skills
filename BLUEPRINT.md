# One-Skills 全局业务活蓝图 (Living Blueprint)

> **定位**：本项目（one-skills 套件）唯一的功能全景与业务逻辑真理源。纯粹记录业务需求与系统逻辑流转（坚决不写视觉 UI 样式），开发前用于对齐意图，开发中指导实现，开发后用于核对验收与生成架构图。

---

## 1. 系统定位与核心背景（AI 必须掌握的业务常识）

- **一句话定位**：为 AI Agent 提供标准化、低延迟、零外部重型依赖的工具与技能套件，赋能知识库摄入检索、长期记忆沉淀与业务流转。
- **关键背景与边界说明**：
  - **one-wiki 模块**：个人 Wiki/第二大脑知识库检索与同步工具，底层存储为 Markdown，检索层基于 SQLite FTS5（`.fts.db`）提供 BM25 检索。
  - **one-memory 模块**：海马体长期记忆系统，用于管理用户偏好、每日流水与历史决策，底层同样基于 SQLite FTS5。
  - **one-scrolls 模块（卷轴）**：低频专用的实操手册与避坑指南封存库，平时卷起不占常驻上下文，按需展开。底层存储为 Markdown，检索层同样为 SQLite FTS5（`.fts.db`）+ BM25。
  - **依赖约束**：严禁引入外部重型分词库（如 jieba）或常驻守护进程；坚持 Python 标准库与 SQLite 原生能力（WAL 模式 + FTS5 + unicode61 tokenizer）。

---

## 2. 全景功能与业务逻辑地图 (Functional & Logic Map)

### 2.1 one-wiki 个人知识库检索与同步

- **模块定位**：管理 Markdown Wiki 知识库的全文索引，保证磁盘文件变更与 FTS5 检索库之间的高效双向一致性与毫秒级召回。

#### 2.1.1 中英双语全文检索分词机制 (Hybrid Tokenization)
- **使用者/角色**：检索调用方、文档同步脚本。
- **触发条件 (Trigger)**：
  - 索引构建：同步单篇或全量重建时，对文档标题与正文执行 `tokenize(text)`。
  - 检索查询：用户执行 `search <关键词>` 时，对查询词执行 `tokenize(query)`。
- **业务逻辑与流转 (Logic & Behavior)**：
  1. 使用正则匹配所有连续 CJK 中文字符串（`[\u4e00-\u9fff]+`）。
  2. 对连续中文字符串执行 1-gram 单字与 2-gram 双字滑动窗口展开（如“量化投资”展开为“量 量化 化 化投 投 投资 资”），各分词单元以空格分隔。
  3. 西文（英文、数字、符号、连字符等）完全原样保留，不遍历截断。
  4. 将展开后的文本直接写入 SQLite FTS5（采用 `tokenize='unicode61'`）。由 SQLite 原生分词器统一处理西文按词边界切分及大小写折叠。
- **预期结果 (Result)**：既保证了中文无空格场景下的双字与单字高召回率，又保持了西文（如 `Python 3.12`、`hello-world`）的原始语义与精确匹配。
- **业务规则与边界 (Rules & Boundaries)**：
  - 零外部依赖，纯正则实现。
  - 西文不作人工截断过滤，完全放行给 FTS5 `unicode61` 处理。

#### 2.1.2 查询期 JIT 增量自愈同步机制 (JIT Self-Healing Sync)
- **使用者/角色**：终端用户、AI Agent 查询接口。
- **触发条件 (Trigger)**：每次执行 `wiki.py search <关键词>` 查询时，在执行 SQL 查询前自动触发。
- **业务逻辑与流转 (Logic & Behavior)**：
  1. 系统维护 `file_meta (path TEXT PRIMARY KEY, mtime REAL)` 元数据表。
  2. 检索前调用 `ensure_synced(repo_dir, conn)`，快速扫描 `onewiki/` 目录下所有 `.md` 文件并获取当前磁盘 `mtime`。
  3. 增量更新判断：
     - 若文件在 `file_meta` 中不存在，或磁盘 `mtime > db_mtime`：触发单文件重新索引，提取最新标题、分类与正文分词，更新 `docs_fts` 与 `file_meta`。
     - 若 `file_meta` 中记录的文件在磁盘上已被删除：自动从 `docs_fts` 和 `file_meta` 中清理该记录。
  4. 若有更新或清理，统一提交事务；无变更则直接通过。
- **预期结果 (Result)**：用户或外部程序编辑、新增、删除 Markdown 页面后，无需手动执行 `sync` 或后台维护守护进程，下一次检索即可自动感知并检索到最新内容。
- **业务规则与边界 (Rules & Boundaries)**：
  - 无后台常驻进程，按需惰性触发。
  - 扫描基于目录树与文件系统 `mtime` 对比，无变更时仅做一次内存字典比对（耗时 < 5ms），不产生多余磁盘写入与事务开销。

#### 2.1.3 全量索引重建与手动增量同步 (Rebuild & Sync)
- **使用者/角色**：管理员、批量运维脚本、`ingest` 编译流程。
- **触发条件 (Trigger)**：
  - 显式执行 `python3 scripts/wiki.py rebuild`。
  - 显式执行 `python3 scripts/wiki.py sync <相对路径>`。
- **业务逻辑与流转 (Logic & Behavior)**：
  - `rebuild`：清理旧数据库文件（含 WAL/SHM），重新建表，清空并全量遍历 `onewiki/` 目录重建 `docs_fts` 与 `file_meta`。
  - `sync`：判断目标文件是否存在，存在则读取、解析并原子更新 `docs_fts` 与 `file_meta`；不存在则从两张表中级联删除。
- **预期结果 (Result)**：手动或自动化管道可精准控制单文件或全量索引同步状态。
- **业务规则与边界 (Rules & Boundaries)**：保持与 JIT 自愈同步使用相同的单文件索引/删除底层实现，逻辑严格一致。

---

### 2.2 one-memory 海马体记忆检索

- **模块定位**：管理 AI Agent 的长短期海马体记忆，支持记忆碎片的快速分块录入与高相关度检索。

#### 2.2.1 记忆中英混合全文分词机制
- **使用者/角色**：记忆写入与检索系统。
- **触发条件 (Trigger)**：向海马体写入记忆条目（`insert_entries`）对标题与内容分词。
- **业务逻辑与流转 (Logic & Behavior)**：
  - 与 `one-wiki` 一致，使用正则捕获连续 CJK 字符并展开为 1-gram / 2-gram。
  - 放行所有英文字符、数字、标点及符号，由 FTS5 `unicode61` 完成原生分词。
- **预期结果 (Result)**：消除原手写字符循环中对英文词组的截断与符号丢弃问题，提升多语言混合记忆的召回质量。
- **业务规则与边界 (Rules & Boundaries)**：保持代码精简与无外部依赖原则。

#### 2.2.2 记忆分块提取与多级锚点索引
- **使用者/角色**：海马体流水写入与回溯查询。
- **触发条件 (Trigger)**：`memory.py sync` 或 `rebuild`。
- **业务逻辑与流转 (Logic & Behavior)**：
  - 将 Markdown 拆解为具有层级锚点的条目列表 `(anchor, title, content)`。
  - 二级/三级标题作为锚点，列表项（`- **名称**：内容`）作为细粒度记录。
  - 写入 `docs_fts`，保留 `raw_title`、`raw_content` 用于展示高亮摘要，分词字段用于快速检索。
- **预期结果 (Result)**：精准定位到某篇日记或记忆文档的具体锚点小节，返回命中上下文。

---

### 2.3 one-scrolls 卷轴库检索与封存

- **模块定位**：封存低频专用的本机实操手册与避坑指南，形成"平时卷起、用时展开"的按需知识层，避免常驻上下文膨胀。

#### 2.3.1 卷轴封存与检索机制
- **使用者/角色**：Agent、终端用户。
- **触发条件 (Trigger)**：
  - 检索：用户说“查卷轴”“展开卷轴”“查避坑手册”“怎么配置 XX”时，执行 `scrolls.py search <关键词>`。
  - 封存：用户说“封存卷轴”“记一份卷轴”“创建卷轴”时，写入 `scrolls/<英文分类>/<中文主题>.md`。
- **业务逻辑与流转 (Logic & Behavior)**：
  1. 卷轴库位于 `~/onespace/github/one-skills/scrolls/`，按英文领域分类（如 `tech/`、`mindset/`），由 `index.md` 提供大纲导航。
  2. 检索走 `scrolls.py` 的 BM25 FTS5 全文检索，返回 Top-5 候选（含分类、标题、锚点、高亮摘要），Agent 仅精准展开最相关的 1~2 篇。
  3. 封存后需执行 `scrolls.py sync "<分类>/<主题>.md"` 增量同步索引，并更新 `index.md` 大纲。
- **预期结果 (Result)**：低频实操知识零常驻开销，检索毫秒级召回。
- **业务规则与边界 (Rules & Boundaries)**：
  - **严禁**兼容旧命名（`light-skills` / `one-light-skills` / `light_skills.py` / `ONE_LIGHT_SKILLS_DIR`）——用户明确要求彻底改名，不留任何旧别名。
  - 个人笔记走 one-wiki，个人记忆走 one-memory，均不存入卷轴库。

---

## 3. 全局演进记录 (Roadmap & Status)

- [x] **2026-09-11**:
  - `one-light-skills` → `one-scrolls`，`light-skills/` → `scrolls/` 全面改名；`light_skills.py` → `scrolls.py`，环境变量 `ONE_LIGHT_SKILLS_DIR` → `ONE_SCROLLS_DIR`，触发词改为「查卷轴/展开卷轴/封存卷轴」，**不留旧别名**。

- [x] **2026-09-10**:
  - `one-wiki`：优化 `tokenize` 为 CJK 单双字展开 + `unicode61` 西文放行。
  - `one-wiki`：实现方案 A（基于 `file_meta` 与 `mtime` 的查询期 JIT 增量自愈同步）。
  - `one-memory`：优化 `tokenize` 为统一的 CJK 展开 + `unicode61` 西文放行。
  - 初始化全局业务活蓝图 `BLUEPRINT.md`。
