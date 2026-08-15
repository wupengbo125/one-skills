---
name: note-to-wiki
description: "把用户说的话记录到 Wiki 的 raw/ 目录，文件名带日期。不分类、不编译、不建页面。"
---

# Note to Wiki

用户说"记一下"或"记录到 Wiki"时触发。

## 唯一操作

1. `cd ~/onespace/github/one-llmwiki && git pull`
2. 取当前日期 `YYYY-MM-DD`
3. 把用户内容写入 `raw/YYYY-MM-DD_<简短slug>.md`
4. 文件内容就一行标题 + 用户原文，不要加 frontmatter、不要加任何多余结构
5. `git add -A && git commit -m "note: <标题>" && git push`
6. 告诉用户完成

## 约束

- **不要**创建分类目录
- **不要**创建 summary / concept / entity 页面
- **不要**更新 index.md
- **不要**加 frontmatter
- **不要**跑 git commit/push（除非用户明确要求）
- 只做一件事：写文件到 raw/
