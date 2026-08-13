# Ingest Markdown into the Wiki

Compile accepted Markdown source files into the durable personal wiki. Use the same operations for the initial build and every subsequent update.

## Canonical personal knowledge model

Maintain these OpenWiki canonical pages when the Markdown evidence makes them relevant:

- `onewiki/index.md`: navigation and current high-level status. Emphasize confirmed and strongly supported knowledge; link out for detail.
- `onewiki/open-questions.md`: unresolved uncertainty about the user's knowledge base or memory model that would impair future assistance.
- `onewiki/themes.md`: a compact index of recurring themes and trends, not a narrative source digest.
- `onewiki/commitments.md`: concrete work tasks, approvals, decisions, scheduled work, and follow-ups, with owner and status when evidence supports them.
- `onewiki/personal-logistics.md`: appointments, travel, household tasks, life-admin deadlines, and other non-work logistics.
- `onewiki/sources/<source>.md`: compact provenance and evidence coverage when source-specific context must be preserved. Canonical explanations still belong on domain pages.

Create or update these pages only when relevant evidence exists. Do not create empty canonical files merely because they are named here.

### Open questions

- Add an open question only for a real knowledge gap, ambiguous relationship, contradiction, unclear routine, missing preference, or context needed for future assistance.
- Do not copy every unresolved question or TODO found inside a source document into `open-questions.md`.
- Group related uncertainty under one stable topic key instead of creating repeated questions for the same subject.
- Use `Active`, `Answered`, and `Stale` sections. Preserve the original question when moving it, and record the deciding evidence or stale reason and date.
- When new evidence answers an active question, move it to `Answered` and link the canonical answer or supporting evidence.

Use this compact shape:

```markdown
# Open Questions

## Active
### <topic-key>: <question>
- Owner: <person/team/unknown>
- Seen: YYYY-MM-DD
- Evidence: <short source references>

## Answered
### <topic-key>: <original question>
- Evidence: <canonical answer or source>
- Answered: YYYY-MM-DD

## Stale
### <topic-key>: <original question>
- Why: <short reason>
- Last seen: YYYY-MM-DD
```

### Themes

- Keep `themes.md` compact. Prefer a table containing topic key, signal, first seen, last seen, confidence, sources, evidence count, status, and short evidence.
- Treat themes as recurring signals, not detailed explanations. Put durable detail on canonical domain pages and link there.
- Update an existing theme instead of appending a second description of the same pattern.
- Promote weak evidence only when it recurs, has source diversity, or is strongly supported by one authoritative source.

### Commitments and logistics

- Route work commitments, decisions, approvals, scheduled work, and follow-ups to `commitments.md` when they need a cross-topic canonical view.
- Record an owner as `me`, `team`, `other:<name>`, or `unknown` only when evidence permits that classification.
- Route personal appointments, travel, errands, household work, and life-admin deadlines to `personal-logistics.md`, preserving date, time, location, and status when available.
- Do not turn informational notes, receipts, promotions, routine notices, or speculative possibilities into commitments.

### Cross-source synthesis

- Deduplicate recurring projects, people, organizations, decisions, questions, and commitments using stable topic keys or slugs.
- Keep source pages as provenance indexes; make domain pages the canonical home for durable knowledge shared across sources.
- When evidence changes a canonical fact, update every affected relationship and index rather than preserving incompatible duplicates.

## Discovery

1. Inspect every `.md` file directly under `raw/`, the existing `raw/<topic>/` structure, and existing pages under `onewiki/`. Ignore all non-Markdown files.
2. Treat a `.md` file directly under `raw/` as an unclassified inbox item. Infer a primary topic from the durable content, preferring an existing topic. Leave a low-confidence item in the inbox and list candidate topics with reasons for uncertainty.
3. Use the bootstrap path if the wiki lacks substantive canonical pages: inventory key domains, sources, projects, people, workflows, decisions, relationships, contradictions, and open questions across all accepted evidence.
4. Otherwise use the incremental path: run `git diff --name-only <last_ingest_commit> HEAD -- raw/` and `git status -s raw/` to inspect only changed Markdown sources under `raw/`. Compare changed evidence against the wiki and identify new durable knowledge, changed or superseded claims, resolved or new contradictions, stale uncertainty, and relationships needing revision. Avoid a full scan when a diff exists. Update `last_ingest_commit` in `onewiki/index.md` when done.
5. Check existing canonical pages before suggesting replacements. Preserve unrelated accurate content and established terminology. Suggest deleting a page only when it no longer has remaining evidence or independent value.

## Ingest plan

Design the minimal complete set of changes to canonical pages. Do not impose a summary/concept/entity taxonomy or create one page per source file; synthesize source files that describe the same subject.

Present one complete plan table containing:

- Each source file and its current or proposed primary topic;
- Each source file move;
- Each Wiki page, index, semantic link, uncertainty label, and diagram to create, update, or delete;
- `onewiki/log.md` entry;
- Exact destination path and evidence-backed reason for every operation.

Report No-op and write nothing if the evidence adds no durable knowledge and the wiki is accurate. Otherwise pause for one user confirmation.

## Writing

After confirmation:

1. Execute only the approved source moves and wiki edits.
2. Synthesize evidence into canonical explanations instead of appending disconnected notes.
3. Preserve credible conflicts as contested, and resolve open questions only when supported by evidence.
4. Create a page only when a substantive knowledge area lacks a proper canonical home.
5. Update affected semantic links, `onewiki/<topic>/index.md` files, `onewiki/index.md`, and diagrams.
6. Append the approved ingest entry to `onewiki/log.md` after all other planned changes succeed.

## Review

Reconcile the final tree against the ingest plan and inspect adjacent canonical pages touched by the changes. Ensure accepted sources have a primary topic, durable knowledge has a canonical home, superseded claims are handled explicitly, links resolve, and navigation is complete. Perform a local `git commit` (never auto-push) and update `last_ingest_commit` in `onewiki/index.md`. Remove redundant content and low-value stubs, then run completion checks from `common.md`.

Completion means the durable wiki accurately incorporates all accepted Markdown evidence without rewriting unrelated knowledge.
