---
name: one-book-notes
description: "读书笔记专用路由：「记到《认知觉醒》」、「记到《正念的奇迹》时触发。"
---

# Book Notes (读书笔记专用路由)

| 书籍 / 关键词 | 目标文件绝对路径 |
| :--- | :--- |
| **认知觉醒** | `~/onespace/github/one-llmwiki/raw/mindset/认知觉醒.md` |
| **正念的奇迹** | `~/onespace/github/one-llmwiki/raw/mindset/正念的奇迹.md` |

## 执行流程

1. **确定目标文件**：查上表匹配目标路径
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