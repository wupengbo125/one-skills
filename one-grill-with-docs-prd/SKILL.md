---
name: one-grill-with-docs-prd
description: Use when user say "讨论需求" or "grill" or "prd".
---

# Grill With Docs PRD

Run a `/grilling` session, using the `/domain-modeling` skill.

1. 必须先保证你运行了上面两个skill，你再走下面的流程。
2. 每个问题必须调用 `ask_question` 工具，禁止在聊天框文字提问。
3. **同步写 docs*：读取同目录 `PRD-TEMPLATE.md`，检查 `docs/prd/` 目录下已有编号，按三位序号自动递增创建或更新 `<序号>-<slug>.md`（如 001/002/003），每确认一项立即填写。也要同时写`/domain-modeling/` skill对应的md文件。
4. 用弹窗获得用户明确确认后方可结束。禁止编写实施代码。
