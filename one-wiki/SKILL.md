---
name: one-wiki
description: "Use when: 摄入/查询 Wiki 知识库，或记录/回忆 one-memory 记忆库时使用。"
argument-hint: "ingest | query | lint | parse | memory-recall | memory-remember"
---

# One Wiki & Memory 统一知识与记忆管理

从显式参数或用户意图选择操作目标：

---

## 路由 1：Wiki 知识库（默认）
根目录：`$one_llmwiki_dir/`

| 操作 | 适用场景 | 读取参考文件 |
|---|---|---|
| `ingest` | 摄入/整理 Markdown 到个人 Wiki | `./references/common.md`、`./references/ingest.md` |
| `query` | 检索/查询个人 Wiki 知识库 | `./references/common.md`、`./references/query.md` |
| `lint` | 检查 Wiki 知识库质量与链接 | `./references/common.md`、`./references/lint.md` |
| `parse` | 解析长文档生成大纲树 | `./references/common.md`、`./references/parse.md` |

---

## 路由 2：One Memory 长期记忆库
根目录：`~/onespace/github/one-memory/`

| 操作 | 触发场景 | 操作流程 |
|---|---|---|
| `memory-recall` | 用户说“想一下/回忆一下 [某事]” | 1. 读取 `INDEX.md` 索引<br>2. 定位并读取目标 `memories/<file>.md`<br>3. 提取关键事实回答 |
| `memory-remember` | 用户说“记住/存入记忆库 [某事]” | 1. 写入 `memories/<name>.md`<br>2. 在 `INDEX.md` 追加单行描述与标签<br>3. Git 提交并推送：`cd ~/onespace/github/one-memory && git add . && git commit -m "feat(memory): add <name>" && git push` |

---

只读取当前操作对应的参考文件，直接执行用户当前请求。
