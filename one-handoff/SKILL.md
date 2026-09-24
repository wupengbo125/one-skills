---
name: one-handoff
description: Compress this session into `handoff.md` — a cold-start brief the next agent works from.
argument-hint: "what will the next session focus on?"
disable-model-invocation: true
---

# Project Handoff

Compress this session into `handoff.md` at the workspace root. The next agent starts cold and works only from this file, so it has to stand on its own. One file, one job: each run overwrites it, so it always describes the latest state instead of piling up history.

## Steps

1. **Sweep the session.** Keep the settled outcomes: what got done, where it stalled, what was decided.

2. **Ground each item.** Verify it against the real state — `git status`, `git log`, the files themselves. Keep what traces to a file, a commit, or a command; cut the rest. Redact every secret: keys, tokens, passwords.

3. **Write `handoff.md`** in four sections:
   - **Completed** — concrete outputs: files changed, commits, commands run.
   - **Current state** — what is in progress, the exact step, and any blocker.
   - **Decisions & constraints** — settled choices with their reasons, and what must not change.
   - **Next steps** — the concrete next actions. When an argument names a focus, it leads here.

   Reference artifacts by path or diff rather than copying them; the reader has the repo.

4. **Self-check.** Re-read as the cold reader: can they start without asking you anything?
