---
type: concept
title: <page title>
description: <one or two retrieval-oriented sentences>
resource: <optional canonical URI>
tags: [<optional English tags>]
timestamp: <optional ISO 8601 datetime>
---

# <page title>

> <summary overview and scope boundaries>

---

## Core responsibilities and source locations

- **Core responsibilities**: <brief description of component/feature role>
- **Primary sources**: [<filename>](file://<absolute path>)
- **Key symbols/APIs**: `<class/function/symbol>`

---

## Runtime flow and relationships

```mermaid
sequenceDiagram
    autonumber
    actor User as Caller
    participant Core as Core Component
    participant Service as Dependent Service

    User->>Core: Request
    Core->>Service: Processing
    Service-->>Core: Response
    Core-->>User: Output
```

---

## Invariants and error handling

- **Core Invariants**: <rules and state constraints that must hold true>
- **Failures and retries**: <error paths, cleanup logic, and retry strategies>

---

## Test coverage and verification

- **Test coverage**: [<test file>](file://<absolute path>)
- **Verification command**: `<test or build command>`
