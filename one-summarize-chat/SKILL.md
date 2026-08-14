---
name: one-summarize-chat
description: 当用户要求“总结今天聊天”、“保存聊天记录”或输入“summarize chat”时触发，将当天的对话历史总结整理为 Markdown 文件保存到 $one_llmwiki_dir/raw 目录
---

# Summarize Chat

本 Skill 负责提取并总结当天的会话/聊天记录，整理为高信号的结构化文档，并保存至 `$one_llmwiki_dir/raw/` 目录下。

## 适用场景与触发词
- 触发词：“总结今天聊天”、“保存今天聊天”、“总结对话”、“summarize chat”。

## 运行规则与步骤

1. **确定保存路径**：
   - 目标目录：优先使用 `$one_llmwiki_dir/raw/`；若环境变量未定义，则使用 `~/onespace/github/one-llmwiki/raw/`。
   - 文件命名格式：`YYYY-MM-DD-chat-summary.md`（若当天已存在，则追加序号或扩展名）。

2. **提取与总结聊天记录**：
   - 梳理当天对话的核心议题、关键决策、实现的代码变动以及后续待办（TODO）。
   - 按 Markdown 格式结构化排列（包含：概况总结、关键讨论点、代码/架构变更、遗留问题等）。

3. **保存与反馈**：
   - 自动创建不存在的目录并将总结结果写入目标 `.md` 文件。
   - 完成后向用户返回成功保存的文件绝对路径及要略概述。
