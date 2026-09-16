# 记忆沉淀指南 (Triple-Memory System)

记忆分两仓：项目随身记忆 `<项目根>/onememory/`（含规则轨与事实轨）+ 全局海马体 `~/onespace/github/one-hippocampus/`。

---

## 〇、三轨边界总表（记录前先判定去向）

| 内容类型 | 去向 |
|---|---|
| 项目行为规则、运维/构建/排障知识（"以后怎么做"） | `<项目根>/onememory/rules.md`（≤150行） |
| 本次改动的事实、排查过程、决策（"做了什么"） | `<项目根>/onememory/timeline.md` + `tasks/` |
| 跨项目个人稳定偏好、身份习惯 | 海马体 `personal/preferences.md` / `personal/profile.md` |

---

## 一、沉淀 SOP

改动代码/配置并自测通过后严格按序执行。**摘要只生成一次**，Step 1 与 Step 3 复用同一份。

会话 ID：已知则取**前 8 位**；未知（未装插件或临时 Agent）则不带 ID、不建案卷，**严禁伪造假 ID**。

### Step 1 项目随身记忆 `<项目根>/onememory/`
1. **事实轨 - 流水**：向 `timeline.md` 末尾追加单行（全项目一个文件，不按天切分）
   - 有会话 ID：`- YYYY-MM-DD HH:mm [ID前8位] 结论`
   - 无会话 ID：`- YYYY-MM-DD HH:mm 结论`
   - **硬约束**：单行 ≤80 字，只写做了什么与结论；过程、教训、排障细节一律进案卷；禁止写元信息（如"无会话ID""不建案卷"）
   - **体积管理**：超 300 行按月归档为 `timeline-YYYY-MM.md`
2. **事实轨 - 案卷**（有会话 ID 且任务非平凡时）：增量维护 `tasks/<会话ID>.md`，记背景诉求、排查过程、关键决策、代码结论、涉及产物。
3. **规则轨**（触发时）：本轮识别到项目级行为规则或知识则更新 `rules.md`（≤150 行，超限同类合并）。规则、排除清单与文件骨架见 [rules-memory.md](rules-memory.md)。

### Step 2 提交
代码与 `onememory/` 同批 `git add` + commit（pre-commit 已门禁，禁止 `--no-verify`）。

### Step 3 海马体独立落盘
向 `~/onespace/github/one-hippocampus/memory/<YYYY-MM>/<YYYY-MM-DD>.md` 追加单行（日期已在文件名，行内不重复；项目路径以 `~` 开头），并在该仓独立提交：
- 有会话 ID：`- HH:mm [~/项目完整路径] [ID前8位] 摘要`
- 无会话 ID：`- HH:mm [~/项目完整路径] 摘要`

---

## 二、全局画像与首读规则

- 获知稳定偏好 → 追加海马体 `personal/preferences.md`（按分类一条一条，不按天）
- 获知身份、习惯 → 更新 `personal/profile.md`
- **进入项目首次回复前，若存在 `<项目根>/onememory/rules.md` 必须先读**，作为项目级指令
