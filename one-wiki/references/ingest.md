# 摄入与编译 (ingest)

将 `raw/` 中的源材料提炼编译入 `onewiki/` 持久知识库。

## 执行步骤

1. **发现与计划**：
   - 扫描 `raw/` 根目录下未分类的 `.md` 源文件。
   - 拟定分类 `<topic>`，简短向用户列出拟新建/更新的页面计划。
2. **移动与编译**：
   - 确认后，将源文件移入 `raw/<topic>/<filename>.md`。
   - 提炼核心概念与实体写入 `onewiki/<topic>/<概念/实体>.md`。
   - 页面头部加入原文双链：`> 源文件：[[../../raw/<topic>/<filename>.md|查看原文]]`。
   - 概念页附带极简 frontmatter（type, title, description）。
3. **维护大纲与索引**：
   - 更新 `onewiki/<topic>/index.md` 与总索引 `onewiki/index.md`。
   - 向 `onewiki/log.md` 追加：`## [YYYY-MM-DD] ingest | <主题>` 记录。
   - 执行 `python3 scripts/wiki.py sync "<相对路径>"`。
4. **提交 git**：提交本地 commit。
