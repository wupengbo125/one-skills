# Query the code Wiki

Answer engineering questions from the repository Wiki.

1. Read `onewiki/index.md` and the smallest set of linked pages that can answer the question.
2. Follow semantic links across related systems when the question crosses a runtime, data, ownership, security, or lifecycle boundary.
3. Answer from Wiki evidence first. Preserve exact code identifiers, source paths, symbols, commands, and tests recorded there.
4. If the Wiki is incomplete or contradictory, inspect only the narrow source and focused tests needed to resolve the question. Distinguish current source evidence from existing Wiki content and identify the documentation gap.
5. State uncertainty and evidence limits instead of inventing behavior.
6. Do not modify repository or Wiki files. If the answer reveals a durable documentation gap, recommend `ingest`.

Completion means the answer is direct, traceable, and useful for a concrete maintenance, debugging, or extension task.
