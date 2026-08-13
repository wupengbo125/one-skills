# Ingest the code Wiki

Maintain the source-grounded Code Wiki under `onewiki/`. Select the internal path from the current Wiki state.

## Bootstrap path

Use this path when `onewiki/` has no substantive canonical Wiki content.

1. Inspect repository and workspace manifests, applications, services, packages, runtime entrypoints, public APIs, schemas, persistence, queues, caches, operational configuration, deployment definitions, generated contracts, and representative tests.
2. Identify major domains and cross-system workflows. Follow imports, symbols, runtime calls, shared data, and tests across directory boundaries.
3. For every substantial area, inspect representative implementation symbols, at least one important caller or consumer, and focused tests covering normal behavior, invariants, and failure paths.
4. Look for registration and export chains, authentication and authorization boundaries, configuration precedence, retries, partial failure, concurrency, cleanup, background jobs, migrations, and operational workflows when present.
5. Inspect existing `onewiki/` pages and preserve useful accurate material.
6. Build an internal repository inventory before drafting. For every substantial component and workflow, record its responsibility, entrypoints, dependencies, consumers, state, contracts, invariants, tests, operational evidence, and canonical wiki page or explicit evidence-blocked disposition.
7. Rank documentation areas by runtime importance, dependency centrality, public surface, operational risk, and test ownership. Do not use page count or source directory count as the target.
8. Create `onewiki/index.md` with a high-level overview and links to every major Wiki area, then write the planned substantive pages.
9. Explain cross-cutting behavior and cross-system flows explicitly. Add source paths, symbols, semantic links, and grounded diagrams where they materially improve change navigation.
10. Maintain affected section indexes and the root index.
11. Reconcile the final wiki tree against the inventory. Give every substantial service, package, API family, domain, workflow, boundary, invariant, extension surface, operational concern, and focused test an adequate canonical home or explicit evidence gap.

## Incremental path

Use this path when `onewiki/` already contains substantive canonical Wiki content.

1. Read `onewiki/index.md` and existing pages relevant to the request.
2. Determine the exact source change set using Git Commit tracking (`last_ingest_commit`):
   - Obtain `last_ingest_commit` SHA recorded in `onewiki/index.md` frontmatter (or via `git log -n 1 --format="%H" -- onewiki/`).
   - Run `git diff --name-only <last_ingest_commit> HEAD` to get all committed changes since the last ingest.
   - Run `git status -s` and `git diff --name-only` to get uncommitted working directory changes.
   - Combine these paths into the target change set. For modified files, inspect `git diff -- <file>` to read only exact changed lines.
   - Form the target change set. Only inspect changed files/diffs and their 1-hop dependencies; avoid broad scans of unchanged files.
3. Inspect changed manifests, entrypoints, public surfaces, schemas, configuration, implementations, callers, consumers, and focused tests.
4. Trace one hop beyond directly changed files to find affected dependencies, workflows, state ownership, contracts, failure paths, operations, and diagrams.
5. Rebuild the full repository inventory only when structural changes or obvious coverage gaps require it.
6. Map every materially affected fact to its canonical page and section, including changed paths and symbols, affected behavior or relationship, related pages, indexes, links, tests, and diagrams.
7. Update every affected canonical page while preserving unrelated accurate content. Remove or correct claims invalidated by current source evidence, create a page only for a substantial new area, and update affected relationships, indexes, and diagrams.
8. If source changes add no durable documentation value and the Wiki is already accurate, update `last_ingest_commit` and report a no-op.
9. Check one-hop dependencies and adjacent workflows revealed by the change without rewriting unrelated well-covered systems.

## Completion

For either path, reconcile planned coverage with the final tree, perform a local `git commit` (never execute `git push`), record `last_ingest_commit: <current_commit_sha>` in `onewiki/index.md` frontmatter, and run the completion checks in `common.md`.

Completion means a new engineer can navigate from intent to owning source, relationships, tests, and narrow validation without another broad repository scan.
