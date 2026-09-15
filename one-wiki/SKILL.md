---
name: one-wiki
description: "记笔记、记到大本子、更新笔记、查询笔记，ingest，lint触发。"
argument-hint: "note | ingest | query | lint, 以及可选内容或问题"
---

# Markdown Wiki

知识库为 GitHub 远端仓库 `wupengbo125/one-llmwiki`（默认分支 main）。
所有文件操作一律直接改远端，不使用本地副本、不做本地 git。按运行环境二选一，两者效果完全等价（写入即自动 commit+push 远端）：

## 通道一（优先）：github-remote MCP —— 豆包环境
运行时存在 github-remote 工具时优先用，凭据由平台托管，无需 token：
- 读/列目录：`get_file_contents`　写/改：`create_or_update_file`　多文件一次提交：`push_files`　删：`delete_file`

## 通道二（兜底）：gh api —— 其他 AI / 其他电脑（gh 已登录，自动认证，无需 token）
- 读文件/列目录：`gh api repos/wupengbo125/one-llmwiki/contents/<path>`
- 写/改固定两步（sha/base64 为内部步骤，对用户透明）：
  1. 先 GET 取当前文件 `.sha`（新建文件无此步）；
  2. 内容 base64 后 PUT：
     `gh api --method PUT repos/wupengbo125/one-llmwiki/contents/<path> -f message="<说明>" -f content="<base64内容>" -f branch=main [-f sha=<上一步sha>]`
- 删除：`--method DELETE` 并带当前 sha。
- 一次改多个文件：逐个 PUT；需合成单个 commit 时用 Git tree API。
- 若报 sha 冲突，重新 GET 取最新 sha 再提交，禁止覆盖。

禁止写本地文件、禁止本地 `git add/commit/push`；写入即已提交远端，不存在本地积压与冲突。

## 意图分流

从用户意图或显式参数选择一个操作，**仅读取对应的一个参考文件**后直接执行：

| 操作 | 说明 | 读取文件 |
| :--- | :--- | :--- |
| `note` | 向 `raw/` 记笔记、存资料、或更新笔记、记到大本子| `./references/note.md` |
| `ingest` | 提炼 `raw/` 资料编译入 `onewiki/`| `./references/ingest.md` |
| `query` | 从 `onewiki/` 检索知识并追溯出处规范页面 | `./references/query.md` |
| `lint` | 检查 `onewiki/` 死链、孤儿页面与冲突矛盾并修复 | `./references/lint.md` |
