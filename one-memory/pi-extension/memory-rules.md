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
   - Action: **Every single** user input should be validated against these trigger conditions. Once matched, check the exclusion list first (see `one-memory/references/rules-memory.md`), then append to `<project root>/onememory/rules.md` (on first record, create the file from the file skeleton — title line, one-line description, `## Entries` heading — and append the entry; merge same-category rules when exceeding 150 lines).
   - Read Gate: If `<project root>/onememory/rules.md` exists, MUST read it as project-level instructions before the first reply in that project.

## Negative Rules [WHEN_TO_SUPPRESS]
- `[READ_ONLY]`: Code inspection, queries, explaining files → NEVER record.
- `[DEBUG_TRIALS]`: Intermediate errors, uncommitted test changes → NEVER record.
- `[CASUAL_CHAT]`: Chitchat, greetings, general knowledge → NEVER record.

## Examples
- ✅ Trigger: Updated database migration & committed → Record: "Updated migration script for user table".
- ❌ Suppress: Read 4 files to explain an architecture question → No record.
- ✅ Trigger: User says "Always keep answers under 3 lines" → Record in personal/preferences.md.
