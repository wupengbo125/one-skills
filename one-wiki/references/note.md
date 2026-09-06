# Raw 原料记录与维护 (Note / Raw Entry)

本模块作为个人知识库 `$one_llmwiki_dir/raw/` 收件箱的唯一输入与更新入口。无论何种动作，开始前必须进入 `$one_llmwiki_dir` 执行 `git pull` 确保最新。

---

## 动作一：记新笔记 (Take Notes)

**适用**：用户输入零散信息、口述文字、代码段、网页资料，或触发词「记笔记」、「存资料」、「take notes」、「qqq」、「Qqq」。

1. **确定文件名**：
   - 取当前日期 `YYYY-MM-DD`。
   - 保存路径：`$one_llmwiki_dir/raw/YYYY-MM-DD-<简短slug>.md`。文件名全小写，空格转连字符 `-`。
2. **快速落盘**：
   - 正文仅需一级标题 + 用户原文/上下文，保持简洁。
   - **严格约束**：直接写入 `raw/` 根层级；不创建子目录；不创建 summary/concept/entity；不加复杂 frontmatter；不更新 index.md。
3. **Git 同步**：
   - 执行 `git add raw/ && git commit -m "note: <简短描述>" && git push`。
4. **反馈**：简短反馈落盘文件路径。

---

## 动作二：总结会话 (Summarize Chat)

**适用**：用户要求「总结聊天」、「保存聊天记录」、「总结对话」或「summarize chat」。

1. **提取与终端预览（禁止直接保存）**：
   - 提炼当前对话核心，按标准模板在终端输出供用户预览：
     ```markdown
     # 会话总结 (YYYY-MM-DD)
     ## 1. 核心主题与背景
     ## 2. 关键讨论与决策
     ## 3. 代码 / 架构 / 配置变更
     ## 4. 待办事项 (TODO)
     ```
2. **确认调整**：
   - 等待用户确认或按反馈调整，直到用户满意。
3. **落盘与推送**：
   - 用户明确确认后写入 `$one_llmwiki_dir/raw/YYYY-MM-DD-<简短主题>.md`。
   - 执行 `git add raw/ && git commit -m "note(chat): <简短主题>" && git push`。
   - 简短反馈文件路径。

---

## 动作三：更新旧文 (Update Notes)

**适用**：用户明确要求「更新到文档里」、「更新文档」、「更新笔记」等修改已有旧文档的场景。

1. **检索定位**：
   - 优先使用 `python3 scripts/wiki.py search "<关键词>"` 或全局检索，在 `raw/` 与 `onewiki/` 中定位最匹配的目标文档。
   - 若有多篇可能，优先根据上下文自主判断最匹配的一篇；若强歧义则列出候选请用户指定。
2. **拟定方案与用户确认（严禁擅自直接修改）**：
   - 在终端明确展示：
     - **目标文档路径**
     - **拟更新/追加的具体内容**
   - 暂停等待用户确认。
3. **确认后写入与推送**：
   - 用户确认后精准更新文件。
   - 执行 `git add -A && git commit -m "docs(update): <简要描述>" && git push`。
   - 同步执行 `python3 scripts/wiki.py sync "<更新的文件相对路径>"`。
   - 简短反馈完成状态与文件路径。
