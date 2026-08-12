---
name: one-handoff
description: Save a high-signal project handoff in the current workspace so a fresh agent can seamlessly continue.
argument-hint: "what will the next session focus on?"
disable-model-invocation: true
---

# Project Handoff

Filter out chat fluff and generate a structured `handoff.md` in the workspace root, overwriting any previous handoff file.

## Handoff Document Structure

The generated `handoff.md` must focus strictly on engineering facts and actionable status:

1. **Completed Work**: Concrete outputs, file edits, or git commits accomplished in this session.
2. **Current State & In-Progress**: Active tasks being worked on, current step, and any immediate blockers.
3. **Key Decisions & Constraints**: Agreed-upon architectural choices, user constraints, or design consensus.
4. **Next Steps & Suggested Skills**: Concrete next steps and recommended skills for the next agent to invoke.

## Guidelines

- **Filter Fluff**: Ignore conversational chatter, trial-and-error noise, or intermediate chat discussion.
- **Reference, Don't Duplicate**: Link to existing artifacts (`MAP.md`, `BLUEPRINT.md`, `docs/prd/`, git diffs) instead of copying their contents.
- **Security**: Redact all sensitive credentials (API keys, tokens, passwords).
- **Tailored Focus**: If arguments are provided, incorporate them into the Next Steps as the primary objective for the next session.
