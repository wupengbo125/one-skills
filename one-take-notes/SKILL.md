---
name: one-take-notes
description: 记笔记、存资料、qqq、Qqq、记录到Wiki/知识库，或输入“take notes”时触发。将内容直接存入 $one_llmwiki_dir/raw/ 并同步 Git
---

# Take Notes (Note to Wiki)

本 Skill 负责将用户提供的信息、文字、口述、代码段或文档资料直接记录并保存至个人 Wiki 的 `$one_llmwiki_dir/raw/` 目录下，并自动执行 Git 提交与推送。

## 运行规则与步骤

1. **前置拉取**：
   - 进入 `$one_llmwiki_dir` 目录执行 `git pull`，确保本地为最新状态。

2. **确定文件名**：
   - 取当前日期 `YYYY-MM-DD`。
   - 文件路径：`$one_llmwiki_dir/raw/YYYY-MM-DD-<简短slug>.md`。
   - 文件名全小写，空格替换为连字符 `-`。

3. **保存与写入**：
   - 若目标目录不存在，先创建目录。
   - 将用户提供的内容写入文件。文件内容只需标题 + 用户原文/上下文，保持简洁。

4. **Git 提交与推送**：
   - 执行 `git add -A && git commit -m "note: <简短描述>" && git push`。

5. **确认反馈**：
   - 告诉用户已完成，并反馈文件路径及简要说明。

## 约束

- **不要**创建分类子目录（直接写入 `raw/` 根层级）。
- **不要**创建 summary / concept / entity 页面。
- **不要**更新 index.md。
- **不要**加复杂的 frontmatter。
- 只做一件事：写文件到 raw/ 并提交推送。
