---
name: one-cognitive-awakening
description: 专门记录《认知觉醒》这本书的读书笔记。当用户说「认知觉醒」后跟内容时触发，把内容追加进 $one_llmwiki_dir/raw/mindset/认知觉醒.md 这一个固定文件，不建日期文件、不建其他文件。是 one-take-notes 的细分专用场景。
---

# Cognitive Awakening Notes (认知觉醒笔记)

本 Skill 是 `one-take-notes` 的细分专用场景，**只管《认知觉醒》这一本书**。用户说「认知觉醒」+ 内容时，把内容追加进**同一个固定文件**，不做分类、不建新文件、不触发摄入流程。

## 运行规则与步骤

1. **前置拉取**：
   - 进入 `/home/pengbo/onespace/github/one-llmwiki` 目录执行 `git pull`，确保本地为最新状态。

2. **唯一目标文件**：
   - 路径固定为 `/home/pengbo/onespace/github/one-llmwiki/raw/mindset/认知觉醒.md`。
   - **不**按日期建文件，**不**建任何其他名字的文件，永远只写这一个文件。
   - 若文件不存在则创建（首次使用）。

3. **追加写入**：
   - 在文件末尾追加一条笔记，格式：
     ```
     ## YYYY-MM-DD

     <用户原文/口述内容>

     ```
   - 只写用户给的内容，保持简洁，不加工、不加复杂 frontmatter。

4. **Git 提交与推送**：
   - 执行 `git add -A && git commit -m "note: 认知觉醒 <简短描述>" && git push`。

5. **确认反馈**：
   - 告诉用户已完成，并反馈文件路径及简要说明。

## 约束

- **必须**写在 `/home/pengbo/onespace/github/one-llmwiki/raw/mindset/认知觉醒.md` 这一个文件里——直接放 mindset 目录，避免被摄入流程挪走导致下次找不到。
- **不要**创建日期命名的文件，也**不要**创建任何其他文件。
- **不要**触发/依赖摄入（ingest）流程。
- **不要**更新 index.md、不要建 summary / concept / entity 页面。
- 只做一件事：追加内容到单文件并提交推送。
