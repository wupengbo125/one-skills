# Lint the Markdown Wiki

Health-check the compiled personal Wiki and repair confirmed quality problems.

## Audit

1. Read `onewiki/index.md`, every topic index, `onewiki/log.md` when present, and the canonical pages required to assess the whole Wiki. Read relevant `.md` evidence under `raw/` only when a claim must be verified. Ignore every non-Markdown file.
2. Find contradictions between pages, stale or superseded claims, unresolved internal links and anchors, orphan pages, missing reciprocal context, duplicate canonical explanations, inconsistent terminology or metadata, unsupported certainty, low-value stubs, and important concepts lacking a canonical home.
3. Distinguish confirmed defects from possible knowledge gaps. For gaps that require unavailable evidence, recommend questions or new Markdown sources instead of inventing repairs.

## Report and repair

Report every confirmed issue with its exact path, evidence, impact, and proposed repair. If no repair is needed, report a clean lint result and write nothing.

When repairs are needed, present one complete plan table containing every wiki page, index, link, diagram, and `onewiki/log.md` entry to create, update, or delete. Pause for one user confirmation, then execute only the approved repairs. Append the approved lint entry to `onewiki/log.md` after every other planned repair succeeds.

## Review

Re-run the affected checks, resolve all links, and run the completion checks in `common.md`. Do not ingest new knowledge or rewrite unrelated pages during lint.

Completion means all reported confirmed defects are either repaired as approved or explicitly left for the user to decide.
