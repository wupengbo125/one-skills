---
name: one-life
description: "生活日记、记录生活、记日记、查生活日记、回顾生活，ingest，lint触发。"
argument-hint: "note | ingest | query | lint, 以及可选内容或问题"
---

# One Life (个人生活 Wiki)

为 GitHub 远端仓库 `wupengbo125/one-life`（默认分支 main）。
本地克隆路径：`~/onespace/github/one-life`

## 意图分流

从用户意图或显式参数选择一个操作，**仅读取对应的一个参考文件**后直接执行：

| 操作 | 说明 | 读取文件 |
| :--- | :--- | :--- |
| `note` | 向 `raw/` 记日记、记录生活、存随笔、或更新记录、记到大本子 | `./references/note.md` |
| `ingest` | 提炼 `raw/` 生活源材料编译入 `onelife/` | `./references/ingest.md` |
| `query` | 从 `onelife/` 检索生活经历、回答生活问询并追溯出处规范页面 | `./references/query.md` |
| `lint` | 检查 `onelife/` 死链、孤儿页面与冲突矛盾并修复 | `./references/lint.md` |
