---
name: one-memory
description: "Use when: 记住/存入记忆、回忆/想一下、维护 one-memory 长期记忆库时使用。"
argument-hint: "recall | remember | lint"
---

# One Memory 长期记忆库

长期记忆库存储路径：`~/onespace/github/one-memory/`

---

## 核心操作

### 1. recall（回忆 / 想一下）
当用户说“想一下…”、“回忆一下…”或需要查找过往记忆时使用。
1. 读取 `INDEX.md` 总索引文件。
2. 根据索引中的描述和标签，精准定位到对应的 `memories/<file>.md`。
3. 仅读取该目标文件，提取关键信息并回答用户。

### 2. remember（记住 / 存入记忆）
当用户说“记住这个…”、“存到记忆库…”时使用。
1. 在 `memories/` 目录下创建或更新对应的 `xxx.md` 记忆文件。
2. 在 `INDEX.md` 表格中追加或更新单行描述与标签。
3. 执行 Git 提交并推送到远程仓库：
   ```bash
   cd ~/onespace/github/one-memory && git add . && git commit -m "feat(memory): add/update <name>" && git push
   ```

### 3. lint（记忆库巡检）
检查 `INDEX.md` 中的链接与 `memories/` 目录下的实际文件是否完全一致，清理死链或补齐遗漏索引。
