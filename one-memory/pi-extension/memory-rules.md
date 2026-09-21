# Hippocampus Memory Directive

Deliverables are strictly gated by memory consistency.

## Triggers [WHEN_TO_RECORD]
1. `[CODE_COMMITTED]` Code Modification:
   - Condition: Project or business code edited and committed (`git commit`).
   - Action: MUST append today's log to `~/onespace/github/one-hippocampus/memory/YYYY-MM/YYYY-MM-DD.md` before final delivery.
2. `[USER_PREFERENCE]` Long-term Preference:
   - Condition: User explicitly declares enduring preference ("Always...", "Never...", "I prefer...").
   - Action: Append to `~/onespace/github/one-hippocampus/personal/preferences.md`.
3. `[SESSION_WRAP]` Manual Wrap-up:
   - Condition: User types `/wrap` or says "收工".
   - Action: Summarize key decisions and ops into today's log.
4. `[RULES_MEMORY]` Project-level Behavioral Rules:
   - Condition: User provides explicit behavioral instructions, corrects assistant behavior, expresses preferred implementation methods, explains expected task execution methods; OR Agent discovers project knowledge (operations/build/testing/debugging/deployment) during task execution.
   - Action: 逐条用户输入对照触发条件校验；命中后先查排除清单（见 `one-memory/references/rules-memory.md`），再追加到 `<project root>/onememory/rules.md`（首次记录按骨架建文件：标题行 + 一行说明 + `## Entries` 标题，再追加条目；超 150 行时合并同类规则）。**每条规则正文 ≤100 字、建议约 60 字，只写「动作 + 关键对象」；纯命令/可执行序列属知识，不入规范（落事实轨 `onememory/tasks/<会话ID>.md` 案卷）；不写背景。**
   - Read Gate: If `<project root>/onememory/rules.md` exists, MUST read it as project-level instructions before the first reply in that project.

## Negative Rules [WHEN_TO_SUPPRESS]
- `[READ_ONLY]`: Code inspection, queries, explaining files → NEVER record.
- `[DEBUG_TRIALS]`: Intermediate errors, uncommitted test changes → NEVER record.
- `[CASUAL_CHAT]`: Chitchat, greetings, general knowledge → NEVER record.

## Examples
- ✅ Trigger: Updated database migration & committed → Record: "Updated migration script for user table".
- ❌ Suppress: Read 4 files to explain an architecture question → No record.
- ✅ Trigger: User says "Always keep answers under 3 lines" → Record in personal/preferences.md.
