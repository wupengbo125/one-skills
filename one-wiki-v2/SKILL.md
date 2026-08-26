---
name: one-wiki-v2
description: "Use when: 摄入或查询 OneWiki V2 知识库时使用。"
argument-hint: "ingest | query | lint"
---

# OneWiki V2 个人深度知识库

基于第一性原理打造的全新个人知识资产系统：**零 raw 垃圾倾倒，进库即精品，自包含且直接可用。**

知识库根路径：`~/onespace/github/one-wiki-v2/`

---

## 知识库分级地图架构 (Hierarchical Layout)

```text
one-wiki-v2/
├── INDEX.md                     # 🗺️【知识总地图】定义各大领域 (如 tech, finance, ai)
└── <domain>/                    # 【知识领域】如 tech/, finance/, ai/
    ├── README.md                # 🗺️【领域地图】列出子分类与知识文档清单
    └── <subpath>/
        └── <topic>.md           # 📍【高密度知识文档】自包含、深度消化、开箱即用
```

---

## 核心操作与工作流

### 1. ingest（深度消化摄入）
无论是长文输入还是对话沉淀，**严禁存原始文件，严禁生成空洞的摘要外壳**。

* **对话沉淀 (Chat Distill)**：
  将当前会话讨论的架构、方案或业务逻辑，整理成一篇**结构清晰、论据充分的自包含技术文档**。
* **长文摄入 (Deep Ingest)**：
  对输入的万字长文进行“深度消化”——保留核心推导、关键参数、技术架构图、实操步骤与结论，直接重构成高质量的知识文档。
* **入库与挂载**：
  1. 存入对应 `<domain>/<subpath>/<name>.md`；
  2. 在该领域的 `<domain>/README.md` 中注册该文档说明；若是新领域，同步在 `INDEX.md` 挂载；
  3. 执行 Git 提交并推送：
     ```bash
     cd ~/onespace/github/one-wiki-v2 && git add . && git commit -m "docs(wiki): add <domain>/<name>" && git push
     ```

---

### 2. query（分级地图寻路检索）
当用户查询某个概念或技术方案时：
1. **查总地图**：读 `INDEX.md`，根据意图锁定知识领域（如 `tech/`、`finance/`、`ai/` 等）；
2. **进领域地图**：读 `<domain>/README.md`，锁定目标文档；
3. **单文档装载**：仅读取该目标 `.md` 文档回答，零全库盲搜，零浪费上下文。

---

### 3. lint（地图完整性巡检）
检查 `INDEX.md` 到各级 `<domain>/README.md` 及物理 Markdown 文件的引用连通性。
