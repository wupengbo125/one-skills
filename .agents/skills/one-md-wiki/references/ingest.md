# Ingest Markdown into the Wiki

Compile accepted Markdown sources into the persistent personal Wiki. Use the same operation for the first build and every later update.

## Discovery

1. Inspect every `.md` file under `raw/`, the existing `raw/<topic>/` structure, and existing pages under `onewiki/`. Ignore every non-Markdown file.
2. Treat `.md` files directly under `raw/` as unclassified inbox items. Infer one primary topic from durable content, preferring an existing topic. Keep low-confidence items in the inbox and list candidate topics with the reason for uncertainty.
3. If the Wiki has no substantive canonical pages, use the bootstrap path: inventory the important domains, sources, projects, people, workflows, decisions, relationships, contradictions, and open questions in all accepted evidence.
4. Otherwise use the incremental path: run `git diff --name-only <last_ingest_commit> HEAD -- raw/` and `git status -s raw/` to inspect only changed Markdown sources under `raw/`. Compare changed evidence with the Wiki and identify new durable knowledge, changed or obsolete claims, resolved or new contradictions, stale uncertainty, and relationships that need revision. Avoid full scans when diffs are available. Update `last_ingest_commit` in `onewiki/index.md` upon completion.
5. Inspect existing canonical pages before proposing replacements. Preserve unrelated accurate content and established terminology. Propose deleting a page only when it has no remaining evidence or independent value.

## Ingest plan

Design the smallest complete set of canonical page changes. Do not impose a summary/concept/entity taxonomy or create a page for every source file; synthesize sources that describe the same subject.

Present one complete plan table containing:

- each source and its current or proposed primary topic;
- every source move;
- every Wiki page, index, semantic link, uncertainty label, and diagram to create, update, or delete;
- the `onewiki/log.md` entry;
- the exact path and evidence-backed reason for every operation.

If the evidence adds no durable knowledge and the Wiki is accurate, report a no-op and write nothing. Otherwise pause for one user confirmation.

## Writing

After confirmation:

1. Execute only the approved source moves and Wiki edits.
2. Integrate evidence into canonical explanations instead of appending disconnected notes.
3. Preserve credible conflicts as contested and resolve open questions only when evidence supports resolution.
4. Create a page only when a substantial knowledge area has no adequate canonical home.
5. Update affected semantic links, `onewiki/<topic>/index.md` files, `onewiki/index.md`, and diagrams.
6. Append the approved ingest entry to `onewiki/log.md` after every other planned change succeeds.

## Review

Reconcile the final trees against the ingest plan and inspect adjacent canonical pages revealed by the changes. Ensure accepted sources have primary topics, durable knowledge has canonical homes, obsolete claims are handled explicitly, links resolve, and navigation is complete. Perform a local `git commit` (never execute `git push`) and update `last_ingest_commit` in `onewiki/index.md`. Remove redundancy and low-value stubs, then run the completion checks in `common.md`.

Completion means the persistent Wiki accurately incorporates all accepted Markdown evidence without rewriting unrelated knowledge.
