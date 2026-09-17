# 记忆沉淀指南 (Triple-Memory System)

记忆分两处：项目随身记忆 `<项目根>/onememory/`（项目规则 + 改动事实），跨项目记忆 `wupengbo125/one-hippocampus`（每日流水 + 个人偏好与画像）。

---

## 〇、海马体写入通道（远端直写）

**海马体写入一律直接操作远端 `wupengbo125/one-hippocampus`（默认分支 main），不做本地 git、不写本地文件**（写入即自动 commit+push 远端）。查询仍走本地 clone（`~/onespace/github/one-hippocampus/`）。

写入走 **one-ghfile**（仓库 `wupengbo125/one-hippocampus`，分支 main）：
- 默认（其他 AI / 其他电脑）：按 one-ghfile 命令用 ghfile.py（gh api）
- 特例（仅豆包环境）：按 one-ghfile 豆包映射，用 github-remote MCP

---

## 一、沉淀 SOP

改动代码/配置并自测通过后严格按序执行。

### Step 1 生成改动摘要
一句话写出本次改动做了什么、结论是什么。
会话 ID：已知则**流水与案卷文件名都用完整 ID，不截断**；未知（未装插件或临时 Agent）则流水不带 ID，**严禁伪造假 ID**。

### Step 2 项目随身记忆 `<项目根>/onememory/`
1. **事实轨 - 流水**：向 `timeline.md` 末尾追加单行（全项目一个文件，不按天切分）
   - 有会话 ID：`- YYYY-MM-DD HH:mm [会话ID] 结论`
   - 无会话 ID：`- YYYY-MM-DD HH:mm 结论`
   - **硬约束**：单行 ≤80 字，只写做了什么与结论；过程、教训、排障细节一律进案卷；禁止写元信息（如"无会话ID""不建案卷"）
2. **事实轨 - 案卷**（命中任一即建）：排查超 3 步 / 排除过错误方向 / 有权衡决策 / 跨多模块。记背景诉求、排查过程、关键决策、代码结论、涉及产物。
   - 有会话 ID：`tasks/<会话ID>.md`（与流水里的 ID 完全一致，可直接打开，无需前缀匹配）
   - 无会话 ID：`tasks/<YYYY-MM-DD>-<短主题>.md`
3. **规则轨**（触发时）：本轮识别到项目级行为规则或知识则更新 `rules.md`（≤150 行，超限同类合并）。规则、排除清单与文件骨架见 [rules-memory.md](rules-memory.md)。

### Step 3 提交
代码与 `onememory/` 同批 `git add` + commit + `git push`（pre-commit 已门禁，禁止 `--no-verify`）。

### Step 4 海马体独立落盘（远端直写）
用 Step 1 的摘要，按「〇、海马体写入通道」直接写远端 `memory/<YYYY-MM>/<YYYY-MM-DD>.md`（存在则取 sha 后 PUT 追加，不存在则新建；日期已在文件名，行内不重复；项目路径以 `~` 开头）：
- 有会话 ID：`- HH:mm [~/项目完整路径] [会话ID] 摘要`
- 无会话 ID：`- HH:mm [~/项目完整路径] 摘要`

偏好与画像同理走远端：稳定偏好追加 `personal/preferences.md`（一条一条，不按天）；长期画像整合进 `personal/profile.md`。
