# 摄入与编译 (ingest)

将 `raw/` 中的原始源材料提炼编译入 `onewiki/` 持久知识库。
知识库根目录为 `$one_llmwiki_dir/`。

## 执行步骤

1. **扫描与计划**：
   - 扫描 `raw/` 根目录下的源文件，拟定分类 `<topic>`。
   - 简短向用户列出拟新建/更新的页面计划。
2. **移动与编译**：
   - 源文件移入 `raw/<topic>/<filename>.md`。
   - 提炼核心概念与实体写入 `onewiki/<topic>/<概念/实体>.md`。
   - 头部加入原文 Obsidian 双链：`> 源文件：[[../../raw/<topic>/<filename>.md|查看原文]]`。
   - **跨域双链穿透**：严禁受物理目录限制。提炼概念时主动穿透挖掘其底层通识（如在交易中链接底层认知、人性与哲学），自由跨目录建立 `[[概念]]` 双链。
   - 概念页附带极简 Frontmatter：
     ```yaml
     ---
     type: <种类>
     title: <标题>
     description: <面向检索的简述>
     ---
     ```
3. **维护大纲与流水**：
   - 更新分类大纲 `onewiki/<topic>/index.md` 与总索引 `onewiki/index.md`。
   - 向 `onewiki/log.md` 追加：`## [YYYY-MM-DD] ingest | <主题>` 记录。
   - 同步索引：`python3 scripts/wiki.py sync "<相对路径>"`。
4. **提交 git**：提交本地 commit。
