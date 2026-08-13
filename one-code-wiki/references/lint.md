# Lint the code Wiki

Health-check the Code Wiki under `onewiki/`. This is documentation maintenance, not source-code static analysis.

## Audit

1. Read `onewiki/index.md`, affected section indexes, and the canonical pages needed to assess Wiki consistency. Read narrow source and focused tests only to verify a concrete Wiki claim.
2. Find contradictions, stale or unsupported claims, unresolved internal links and heading anchors, orphan pages, duplicate canonical explanations, inconsistent terminology or frontmatter, index drift, stale diagrams, and material coverage gaps.
3. Distinguish confirmed defects from gaps that need unavailable evidence. For unavailable evidence, record the gap; do not invent a repair.

## Repair

1. Repair confirmed defects only under `onewiki/`.
2. Update every affected canonical page, semantic link, index, frontmatter block, and diagram together.
3. Preserve unrelated accurate content and avoid formatting-only churn.
4. If no confirmed defect exists, report a no-op and write nothing.

## Completion

Re-run the affected checks, resolve links, and run the completion checks in `common.md`.

Completion means every confirmed quality defect found in this run is repaired or reported as evidence-blocked.
