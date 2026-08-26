---
name: one-memory
description: "Use when: 记住/存入记忆、回忆/想一下分层记忆与画像、维护 one-memory 记忆库时使用。"
argument-hint: "recall | remember | lint"
---

# One Memory 分级地图记忆导航系统

本系统采用**“全国地图 ➔ 省地图 ➔ 市地图 ➔ 门牌号”**的分级下钻检索机制，实现超低 Token 消耗与零歧义检索。

记忆仓库根路径：`~/onespace/github/one-memory/`

---

## 核心操作与导航协议

### 1. recall（回忆 / 想一下 / 分级地图寻路）
当用户说“想一下…”、“回忆一下…”或查询某领域记忆时，**严格执行逐级寻路，禁止跨级通读**：

1. **第一步：看全国地图**
   * 读取 `INDEX.md`，根据意图锁定领域省份（如 `memories/finance/`、`memories/infra/` 等）。
2. **第二步：看省地图（与市地图）**
   * 读取对应 `memories/<domain>/README.md`。
   * 若存在更深子方向（如 `finance/macro/`），继续读取市地图 `README.md`。
3. **第三步：直达门牌号并装载**
   * 锁定目标卡片文件（如 `global-macro-transmission.md`），仅读取该单文件提取高密度事实并作答。

---

### 2. remember（记住 / 树状分级沉淀）
当用户说“记住这个…”、“存入记忆库…”时：

1. **寻径与建档**：通过地图层级定位目标子目录（必要时建立新子目录与对应 `README.md` 市地图）。
2. **睡眠提炼**：萃取当前对话为 3~5 条高密度断言，写入目标 `xxx.md` 卡片。
3. **更新地图**：在对应层级的 `README.md` 中注册该卡片描述；若是新大类，同步在 `INDEX.md` 挂载。
4. **Git 同步**：
   ```bash
   cd ~/onespace/github/one-memory && git add . && git commit -m "feat(memory): add <domain>/<name>" && git push
   ```

---

### 3. lint（地图完整性巡检）
检查从 `INDEX.md` 到各级 `README.md` 的所有路径引用与实际物理卡片文件是否 100% 连通无断链。
