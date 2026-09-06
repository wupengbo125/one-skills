# 摄入与编译 (ingest)

将 `raw/` 中的原始源材料提炼编译入 `onewiki/` 持久知识库。
知识库根目录为 `$one_llmwiki_dir/`。

## 执行步骤

1. **扫描与计划**：
   - 扫描 `raw/` 根目录下的源文件，判定所属领域分类 `<topic>`：
     - **优先匹配**：现有 topic 目录（英文小写，如 `technology`、`mindset`、`stocks` 等）。
     - **新建分类**：若属于全新领域且无合适旧分类，自动拟定一个简明贴切的新英文分类名（如 `health`、`design`、`life`），若无法确信则在计划中提示用户。
   - 向用户简要列出拟移动路径及拟新建/更新的页面计划。
2. **移动与三层编译**：
   - 将源文件移入 `raw/<topic>/<filename>.md`（新 topic 自动创建目录）。
   - **保留原文语言命名**：原文是什么语言就用什么语言（中文概念直接用纯中文名，如 `车到山前必有路.md`；英文专有名词保留英文，如 `Graphify.md`），不进行无意义的拼音或英文机械转换。
   - **三层萃取**：
     - `summaries/<主题>.md`：一对一结构化浓缩，头部反向链接原文：`> 源文件：[[../../raw/<topic>/<filename>.md|查看原文]]`。
     - `concepts/<核心概念>.md`：提炼方法论、思维模型与核心认知。
     - `entities/<实体名>.md`：提炼具体人物、工具、指标、标的、专有名词或特定对象。
   - **跨域双链穿透**：严禁受物理目录限制。提炼概念与实体时主动穿透挖掘底层通识（如在交易中链接人性哲学，在技术中链接第二大脑），自由跨目录建立 `[[概念]]` 双链。
   - 页面附带极简 Frontmatter：
     ```yaml
     ---
     type: concept | entity | summary
     title: <标题>
     description: <面向检索的简述>
     ---
     ```
3. **维护大纲与流水**：
   - 更新分类大纲 `onewiki/<topic>/index.md` 与总索引 `onewiki/index.md`。
   - 向 `onewiki/log.md` 追加：`## [YYYY-MM-DD] ingest | <主题>` 记录。
   - 同步索引：`python3 scripts/wiki.py sync "<相对路径>"`。
4. **提交 git**：提交本地 commit。