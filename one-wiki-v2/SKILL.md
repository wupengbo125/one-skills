---
name: one-wiki-v2
description: "Use when: 摄入或查询 OneWiki V2 知识库时使用。"
argument-hint: "ingest | query | lint"
---

# OneWiki V2 个人深度知识库

基于第一性原理打造的全新个人知识资产系统：**冷热物理隔离，热层进库即精品，冷层永久存底。**

知识库根路径：`~/onespace/github/one-wiki-v2/`

---

## 冷热物理隔离架构 (Cold-Hot Architecture)

```text
one-wiki-v2/
├── wiki/                        # ⚡【热层·日常检索】分级地图与自包含深度知识（检索唯一入口）
│   ├── INDEX.md                 # 🗺️ 知识总地图
│   └── <domain>/                # 领域目录 (如 tech/, finance/, ai/)
│       ├── README.md            # 🗺️ 领域地图
│       └── <subpath>/<name>.md  # 📍 自包含深度知识文档
│
└── raw/                         # 🧊【冷层·永久档案】原始长文不可变备份（日常检索坚决不读）
    └── <domain>/
        └── <filename>.md        # 原始文献存档
```

---

## 核心操作与工作流

### 1. ingest（冷热双沉淀摄入）
* **场景 A：外部长文摄入**
  1. **冷备份**：将原始文章原封不动保存在 `raw/<domain>/` 对应子目录中作为永久底座；
  2. **热提炼**：深度消化长文，保留核心推导、关键参数、技术架构图与实操步骤，生成自包含精品文档写入 `wiki/<domain>/<subpath>/<name>.md`；
  3. **挂载地图**：在 `wiki/<domain>/README.md` 注册该文档说明；
* **场景 B：对话讨论沉淀**
  直接深度消化当前讨论，将共识与方案写入 `wiki/<domain>/<subpath>/<name>.md` 并挂载领域地图；
* **自动 Git 同步**：
  ```bash
  cd ~/onespace/github/one-wiki-v2 && git add . && git commit -m "docs(wiki): add <domain>/<name>" && git push
  ```

---

### 2. query（热层分级地图寻路检索）
当用户查询某个概念或技术方案时，**严格在 `wiki/` 目录内寻路，坚决不扫描 `raw/`**：
1. **第一步（查总地图）**：读 `wiki/INDEX.md`，锁定知识领域（如 `tech/`、`finance/` 等）；
2. **第二步（进领域地图）**：读 `wiki/<domain>/README.md`，锁定目标文档；
3. **第三步（单文档装载）**：仅读取该目标 `.md` 文档回答，零全库盲搜，零浪费上下文。

---

### 3. lint（地图完整性巡检）
检查 `wiki/INDEX.md` 到各级领域 `README.md` 及物理 Markdown 文件的引用连通性。
