---
name: one-memory
description: "Use when: 记住/存入记忆、回忆/想一下分层记忆与画像、维护 one-memory 记忆库时使用。"
argument-hint: "recall | remember | lint"
---

# One Memory 记忆地图导航系统

本系统采用**“全国总地图 ➔ 领域地图 (如金融地图) ➔ 知识条目”**的寻路机制，实现超低 Token 消耗与零歧义检索。

记忆仓库根路径：`~/onespace/github/one-memory/`

---

## 核心操作与导航协议

### 1. recall（回忆 / 想一下 / 地图寻路）
当用户说“想一下…”、“回忆一下…”或查询某领域记忆时，**严格执行逐级寻路，禁止跨级盲目全库扫描**：

1. **第一步：查全国总地图**
   * 读取 `INDEX.md`，根据意图锁定目标领域（如系统画像、金融投资、基础设施等）。
2. **第二步：进具体领域地图（如金融地图、学科地图）**
   * 读取对应 `memories/<domain>/README.md`。
   * 若存在子方向（如 `finance/macro/`），继续读取该子地图 `README.md`。
3. **第三步：直达具体知识条目**
   * 锁定目标卡片文件（如 `global-macro-transmission.md`），仅读取该单文件提取高密度事实并作答。

---

### 2. remember（记住 / 分级沉淀）
当用户说“记住这个…”、“存入记忆库…”时：

1. **寻径与建档**：通过地图层级定位目标子目录（必要时建立新子目录与对应领域地图 `README.md`）。
2. **睡眠提炼**：萃取当前对话为 3~5 条高密度断言，写入目标 `xxx.md` 知识卡片。
3. **更新地图**：在对应领域 `README.md` 中注册该知识条目；若是新领域，同步在 `INDEX.md` 挂载。
4. **Git 同步**：
   ```bash
   cd ~/onespace/github/one-memory && git add . && git commit -m "feat(memory): add <domain>/<name>" && git push
   ```

---

### 3. lint（地图完整性巡检）
检查从 `INDEX.md` 到各级领域 `README.md` 的所有路径引用与实际物理卡片文件是否 100% 连通无断链。
