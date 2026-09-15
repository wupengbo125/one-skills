---
name: one-wiki
description: "记笔记、记到大本子、更新笔记、查询笔记，ingest，lint触发。"
argument-hint: "note | ingest | query | lint, 以及可选内容或问题"
---

# Markdown Wiki

知识库为 GitHub 远端仓库`wupengbo125/one-llmwiki`（默认分支 main）。
本地克隆路径：`~/onespace/github/one-llmwiki`。

## 通道规则

操作按性质分两种通道：

### 远端通道（仅 note：记笔记 / 更新笔记）

`note` 操作直接写远端，写入即提交，按运行环境二选一：

**通道一（优先）：github-remote MCP** —— 豆包环境运行时存在 github-remote 工具时优先用，凭据由平台托管，无需 token：
- 读/列目录：`get_file_contents`；写/改：`create_or_update_file`；多文件一次提交：`push_files`；删：`delete_file`

**通道二（兜底）：gh api** —— 其他 AI / 其他电脑（gh 已登录，自动认证，无需 token）
- 读文件/列目录：`gh api repos/wupengbo125/one-llmwiki/contents/<path>`
- 写/改固定两步（sha/base64 为内部步骤，对用户透明）：
  1. GET 取当前文件`.sha`（新建文件无此步）；
  2. base64 PUT：
`gh api --method PUT repos/wupengbo125/one-llmwiki/contents/<path> -f message="<说明>" -f content="<base64内容>" -f branch=main [-f sha=<上一步sha>]`
- 删除：`--method DELETE`并带当前 sha。
- sha 冲突，重新 GET 取最新 sha 再提交，禁止覆盖。

操作完更新本地仓库，并汇报已更新本地仓库

### 本地通道（ingest / query / lint 及其他非 note 操作）

直接操作本地仓库`~/onespace/github/one-llmwiki`，用标准文件读写（`read`/`write`/`edit`等工具）。
修改完成后统一提交推送：
```bash
cd ~/onespace/github/one-llmwiki && git add -A && git commit -m "<说明>" && git push
```
操作前先`git pull`确保本地最新。
操作完要汇报已推送到远端。

## 意图分流

从用户意图或显式参数选择一个操作，**仅读取对应的一个参考文件**后直接执行：

| 操作 | 说明 | 通道 | 读取文件 |
| :--- | :--- | :--- | :--- |
| `note` | 向`raw/`记笔记、存资料、或更新笔记、记到大本子 | 远端 | `./references/note.md` |
| `ingest` | 提炼`raw/`资料编译入`onewiki/` | 本地 | `./references/ingest.md` |
| `query` | 从`onewiki/`检索知识并追溯出处规范页面 | 本地 | `./references/query.md` |
| `lint` | 检查`onewiki/`死链、孤儿页面与冲突矛盾并修复 | 本地 | `./references/lint.md` |
