---
name: one-llmwiki-skill
description: 纯 Prompt 驱动的全功能无代码 Wiki 知识库体系 Skill。针对个人唯一永久知识库仓库 ($one_llmwiki_dir/)，包含素材ingest与增量编译、语义 Lint 巡检、Wiki 问答检索与长文档大纲推理 4 大全套 Prompt 编排体系。当用户需要 ingest对话/ingest文件、编译 Wiki、质量巡检、检索问答或解析长文档时触发。
argument-hint: "要执行的 Wiki 任务（ingest对话/ingest文件/编译/Lint/问答/长文档索引）及对应输入内容"
disable-model-invocation: true
---

# 全功能 LLM Wiki 个人知识库 Skill (`one-llmwiki-skill`)

本 Skill 专为管理个人永久知识库而设计，统一基于通用绝对路径 `$one_llmwiki_dir/`（自动解析当前用户家目录）。提供素材归档整理、知识库增量编译、质量巡检、问答检索与长文档推理的全流程支持。

---

## 1. 个人知识库目录架构 (按主题域隔离)

知识库统一绑定在通用根目录：`$one_llmwiki_dir/`

`raw/<主题>/` 与 `wiki/<主题>/` 一一镜像对应，每个主题拥有独立的 `index.md` 与白名单，编译与检索时按主题隔离，互不干扰。（示例结构如下，实际分类名由用户定义与命名）：

```text
$one_llmwiki_dir/
├── index.md                   # 根索引：列出所有主题 Wiki 的入口
├── raw/                       # 原始知识源（按主题分类子目录）
│   ├── AI/
│   └── Finance/
└── wiki/                      # 编译产物（按主题镜像 raw/ 结构）
    ├── AI/
    │   ├── index.md           # AI 主题独立白名单与索引
    │   ├── summaries/
    │   ├── concepts/
    │   └── entities/
    └── Finance/
        ├── index.md           # Finance 主题独立白名单与索引
        ├── summaries/
        ├── concepts/
        └── entities/
```

### 页面 Frontmatter 标准
每个 Markdown 页面头部必须包含 YAML 前言：

```yaml
---
title: "页面标题"
type: concept  # summary | concept | entity
description: 一句话描述（100字以内）
created_at: "YYYY-MM-DD"
updated_at: "YYYY-MM-DD"
---
```

---

## 2. 模块一：知识库增量编译与素材摄入 (Compiler Module)

用于读取未分类素材、`raw/<主题>/` 中的已有素材，或直接将当前会话提炼为素材，划拨归档并增量编译为 `wiki/<主题>/` 页面，同时更新该主题 `index.md`。

### 阶段 1：前置 Git 远程拉取
在开始扫描素材或进行任何 Wiki 编译修改前，Agent **必须先在 `$one_llmwiki_dir/` 根目录执行 `git pull`**，确保本地工作区处于最新远端状态。

### 阶段 2：素材摄入与会话提炼 (Ingest Phase)
当用户指令包含 `ingest对话`、`ingest会话` 或常规素材摄入时触发：
1. **会话提炼模式（`ingest对话` / `ingest会话`）**：
   * Agent 静默审视当前上下文对话，提取核心知识要点与结论，撰写带有 YAML frontmatter 的 Markdown 素材文件，直接生成至 `raw/` 根目录 `raw/YYYY-MM-DD_<slug>.md`。
2. **常规素材模式（`ingest` / `整理 raw`）**：
   * 扫描 `raw/` 根目录下的未分类素材文件。

### 阶段 3：摘要提取与架构规划
对每份待编译素材，Agent 依次完成：

**3a. 摘要提取**：阅读素材全文，产出一个 JSON 对象，包含：
- `"description"`: 一句话描述（100字以内），总结文档的核心贡献
- `"content"`: Markdown 格式的完整摘要，包含关键概念、发现、想法，以及指向可成为跨文档概念页的 `[[wikilinks]]` 链接

**3b. 架构规划**：基于摘要，产出一个 JSON 对象，包含 `"concepts"` 和 `"entities"` 两个顶层键：
- `"concepts"` 包含：
  - `"create"` — 新概念数组：`[{"name": "concept-slug", "title": "标题"}]`
  - `"update"` — 需更新的已有概念，同结构
  - `"related"` — 仅交叉链接的已有概念 slug 字符串数组
- `"entities"` 包含相同三个键，create/update 增加 `"type"` 字段，取值：`["organization", "person", "product", "location", "event"]`
- 规则：
  - 优先 update 已有页面而非 create 新页面
  - 前几篇文档最多创建 2-3 个基础概念
  - 仅当实体是核心或可能重复出现时才创建实体页
  - 严禁创建与已有概念/实体重叠的新条目

### 阶段 4：综合预案呈现与用户统一拍板

在正式移动/创建素材与更新 `wiki/<主题>/` 页面前，Agent 必须生成包含**完整落盘物理路径**的综合编译方案表，并**暂停等待用户拍板确认（全流程仅此一次暂停确认）**：

```markdown
| 原始素材来源/路径 | 素材归档目标 | 页面类型 | 拟执行操作 | 目标 Wiki 物理路径 | 变更说明 |
|---|---|---|---|---|---|
| `[当前会话提炼]` | `raw/spiritual/2026-08-11_note.md` | Summary | 新建摘要 | `wiki/spiritual/summaries/2026-08-11-note.md` | 提炼会话要点并生成摘要 |
| `raw/paper.md` | `raw/AI/paper.md` | Summary | 新建摘要 | `wiki/AI/summaries/<doc-slug>.md` | 归档至 AI 主题并提炼核心观点 |
| `raw/AI/paper.md` | `已在 raw/AI/ 目录` | Concept | 新建概念 | `wiki/AI/concepts/<concept-slug>.md` | 提炼复用方法论/模式 |
| `raw/AI/paper.md` | `已在 raw/AI/ 目录` | Entity | 更新已有实体 | `wiki/AI/entities/<entity-slug>.md` | 追加最新相关引用与数据 |
```

规则说明：
1. **完整路径强制要求**："目标 Wiki 物理路径"必须写明包含主题的完整相对路径（如 `wiki/AI/summaries/paper.md`），严禁仅输出省略主题前缀的短 slug。
2. **素材归档状态明确**：若素材原本已在 `raw/<主题>/` 目录下，在"素材归档目标"列注明 `已在 raw/<主题>/ 目录`；若来自 `ingest对话`，注明拟写入的 `raw/<主题>/<filename>.md` 路径。
3. **新目录命名拍板**：若未分类素材或会话提炼涉及新主题目录，在"素材归档目标"列标识 `[待用户命名新目录]` 请用户指定名称。

用户确认或微调分类/路径后，方可推进阶段 5 的写入。

### 阶段 5：受控写入与页面生成

用户拍板后，Agent 执行物理写入：
1. **白名单校验**：读取当前 Wiki 已有的所有页面路径作为 `[[wikilink]]` 合法目标白名单。生成的所有页面中，`[[wikilinks]]` 只能指向白名单内的已有页面或本次新建的页面，想提及白名单之外的概念时直接写纯文本不加双方括号。
2. **摘要页写入**：将阶段 3 的摘要写入 `wiki/<主题>/summaries/` 目录。
3. **概念/实体页生成**：
   - 新建页面：撰写包含一句话定义与完整 Markdown 内容的概念/实体页。
   - 更新已有页面：将新信息自然融入已有页面，完整重写而非简单追加，保留原有结构。
4. **素材归档**：将 `raw/` 根目录的未分类素材移动至对应的 `raw/<主题>/` 目录。
5. **摘要二次重写**：概念/实体页全部生成完毕后，回头用最终白名单重写摘要页——将无效 wikilinks 替换为纯文本，将纯文本中新出现在白名单里的概念升级为 `[[wikilinks]]`，保留所有事实内容不变。
6. **索引更新**：更新对应主题的 `wiki/<主题>/index.md` 与根 `index.md`。

所有页面使用中文撰写，使用 `[[wikilinks]]` 链接相关页面。

### 阶段 6：后置 Git 自动提交与推送
在物理写入与素材落盘全部完成后，Agent **必须自动在 `$one_llmwiki_dir/` 根目录执行提交与推送**：
```bash
git add .
git commit -m "docs: 增量编译 Wiki 页面并归档素材 [YYYY-MM-DD]"
git push
```

---

## 3. 模块二：语义 Lint 巡检与清洗 (Semantic Linter Module)

用于读取 `$one_llmwiki_dir/` 目录下的所有 Wiki 页面，发现并修复死链、事实冲突与孤立概念。

### 巡检流程
1. 读取 `index.md` 了解整体作用域。
2. 读取摘要页面 (`wiki/<主题>/summaries/`) 了解文档内容。
3. 读取概念页面 (`wiki/<主题>/concepts/`) 检查矛盾与遗漏。
4. 读取实体页面 (`wiki/<主题>/entities/`) 检查矛盾、冗余与孤立。
5. 产出结构化 Markdown 巡检报告。

### 检查项
1. **事实矛盾**：是否有页面对同一个事实做出相互冲突的陈述？
2. **知识遗漏**：是否有明显缺失的主题或未解释的引用？
3. **内容过时**：是否有对"最近"工作、日期或版本的陈述已过时？
4. **内容冗余**：是否有多个页面涵盖相同内容并可以合并？
5. **概念覆盖**：摘要中的重要主题是否缺失了概念页面？
6. **实体覆盖**：摘要中的具名事物是否缺失了实体页面，或已有实体页存在矛盾、冗余或孤立？

---

## 4. 模块三：知识库问答与检索 (Query & Chat Module)

用于基于个人知识库回答复杂提问或进行交互式对话。

### 检索策略
1. 读取 `index.md` 查看所有主题目录与概念摘要。
2. 读取目标主题下的相关摘要页面 (`wiki/<主题>/summaries/`) 了解文档概览。
3. 读取概念页面 (`wiki/<主题>/concepts/`) 进行跨文档综合分析。
4. 对于关于特定人物、机构、地点或产品的提问，优先读取对应主题下的 `wiki/<主题>/entities/` 页面。
5. 当需要更详细的文本时，查阅 `raw/<主题>/` 原始素材或具体章节。
6. 严格基于 Wiki 内容，综合产出清晰、简洁、附带准确引用的回答。若发现强关联且未链接的页面，向用户提出补链接建议。

---

## 5. 模块四：长文档 PageIndex 树状大纲推理 (PageIndex Reasoning Module)

针对 `raw/` 中篇幅极长的文档，生成结构化 Markdown 大纲树（TOC），依靠层级树定位具体章节页码。

### 树状大纲生成与检索
1. 将长文档按章节层次拆解为大纲树结构，包含根节点 title、物理页码范围 (start_page, end_page) 与简短子节点总结。
2. **长文档摘要提炼**：基于大纲树的结构化摘要，撰写一份捕获核心主题与发现的简洁概览（纯 Markdown，不含 frontmatter），供后续概念页生成使用。
3. 当问答 Agent 需要精确查找细节时，先审视大纲树结构，逻辑匹配目标章节所在的具体页码范围，仅读取该页码范围对应的文本进行精确定位。

---

## 6. Agent 操作流程汇总

所有操作均以 `$one_llmwiki_dir/` 为根目录：
* **素材摄入与增量编译**：执行 `git pull`，支持常规文件或 `ingest对话`/`ingest会话` 模式，完成摘要与架构规划，生成包含完整落盘路径的《综合预案表》由用户统一拍板后，落盘/搬运素材至 `raw/<主题>/` 并写入 `wiki/<主题>/` 目录与更新 `index.md`，完成后自动执行 `git add . && git commit -m "..." && git push`。
* **质量巡检/清洗**：审视 `index.md` 与 `wiki/` 下的各页面，输出报告并执行增量修复。
* **提问/对话**：基于根目录 `index.md` 与 `wiki/` 页面内容回答问题。
* **长文档解析**：解析 `raw/` 里的长文档，生成 TOC 大纲树并按需检索。
