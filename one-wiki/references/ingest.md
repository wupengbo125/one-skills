# 摄入与编译 (ingest)

将 `raw/` 中的原始源材料提炼编译入 `onewiki/` 持久知识库。
知识库根目录为 `$one_llmwiki_dir/`。

## 执行步骤

1. **扫描与计划**：
  - 扫描 `raw/` 根目录下的源文件，拟定分类 `<topic>`（若无匹配分类，与用户商量确认，严禁擅自新建）。
  - 特殊位置扫描 raw/misc/下文件，不移动，不分类，直接做其余动作。
  - 其他位置是已经做过分类的并ingest的，禁止再次扫描
  - 简短向用户列出拟新建/更新的页面计划。
2. **移动与三层编译**：
  - 源文件移入 `raw/<topic>/<filename>.md`。
  - **严禁自作主张翻译文件名**：原文是什么语言就用什么语言（中文概念直接用纯中文名，如 `车到山前必有路.md`；英文/技术专有名词保留英文，如 `Graphify.md`）。严禁机械转成英文 kebab-case。
  - **强制三层萃取**：
    - `summaries/<主题>.md`：一对一结构化浓缩，头部链向原文：`> 源文件：[[../../raw/<topic>/<filename>.md|查看原文]]`。
    - `concepts/<核心概念>.md`：提炼方法论、思维模型与认知。
    - `entities/<实体名>.md`：提炼具体人物、工具、指标、标的、对象或设备。
  - **跨域双链穿透**：严禁受物理目录限制。提炼概念与实体时主动穿透挖掘底层通识（如在交易中链接人性哲学，在技术中链接第二大脑），自由跨目录建立 `[[概念]]` 双链。
  - **增量更新既有页面**：若新材料关联已有概念或实体，在其对应页面追加新证据、关联或标记观点更新。
  - 页面附带极简 Frontmatter：
    ```yaml
    ---
    type: concept | entity | summary
    title: <标题>
    description: <面向检索的简述>
    ---
    ```
3. **维护大纲与流水**：
  - 更新分类大纲 `onewiki/[[ORCA_RICH_MD:fd00abcfa14c9ba2abfa6eca340175c0:inline-html:%3Ctopic%3E]]/index.md` 与总索引 `onewiki/index.md`。
  - 向 `onewiki/log.md` 追加：`## [YYYY-MM-DD] ingest | <主题>` 记录。
  - 同步索引：`python3 scripts/wiki.py sync "<相对路径>"`。

