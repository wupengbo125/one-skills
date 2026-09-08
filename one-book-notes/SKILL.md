---
name: one-book-notes
description: "读书笔记专用路由：当用户说「记读书笔记」、「记到书里」、「记到《认知觉醒》」、「记到《正念的奇迹》」或提到给特定书籍记录笔记时触发。"
---

# Book Notes (读书笔记专用路由)

专门负责将读书心得、摘录、反思追加到个人知识库 `one-llmwiki` 中对应的固定书籍文档中。**不建新文件、不按日期分文件、不触发 ingest 摄入流程**。

知识库目录：`~/onespace/github/one-llmwiki/`

## 书籍路由表

根据用户提到的书名，直接路由到唯一目标文件：

| 书籍 / 关键词 | 目标文件绝对路径 |
| :--- | :--- |
| **认知觉醒** | `~/onespace/github/one-llmwiki/raw/mindset/认知觉醒.md` |
| **正念的奇迹** | `~/onespace/github/one-llmwiki/raw/mindset/正念的奇迹.md` |

> 若用户指定了新书且不在上表，默认落盘至 `~/onespace/github/one-llmwiki/raw/mindset/<新书名>.md`。

## 执行流程

1. **确定目标文件**：查上表匹配目标路径，若文件不存在则创建。
2. **追加内容**：在文件末尾追加，格式保持极简：
   ```markdown
   ## YYYY-MM-DD

   <用户原话/笔记内容>

   ```
3. **提交与推送**：
   在 `~/onespace/github/one-llmwiki/` 目录执行：
   ```bash
   git add -A && git commit -m "note: <书名> 读书笔记" && git push
   ```
4. **极简反馈**：一句话回复已记入 `<书名>` 即可。
