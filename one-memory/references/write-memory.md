# 记忆沉淀指南 (Triple-Memory System)

记忆分两处：项目随身记忆 `<项目根>/onememory/`（项目规则 + 改动事实），跨项目记忆 `wupengbo125/one-hippocampus`（每日流水 + 个人偏好与画像）。

---

## 〇、海马记忆仓写入通道（远端直写）

**海马记忆仓写入一律直接操作远端 `wupengbo125/one-hippocampus`（默认分支 main），不做本地 git、不写本地文件**（写入即自动 commit+push 远端）。查询仍走本地 clone（`~/onespace/github/one-hippocampus/`）。

写入：调用 **one-ghfile** skill（先读其 `SKILL.md` 按其方法执行），仓库 `wupengbo125/one-hippocampus`，分支 main

---

## 一、沉淀 SOP

改动代码/配置并自测通过后严格按序执行。

### Step 1 生成改动摘要
一句话写出本次改动做了什么、结论是什么。
流水与案卷均带上完整会话 ID。没有ID就自己生成个作为本会话唯一ID，必须写ID。

### Step 2 项目随身记忆 `<项目根>/onememory/`
1. **事实轨 流水**：向 `timeline.md` 末尾追加 Step 1 的摘要
   `- YYYY-MM-DD HH:mm [会话ID] Step 1 的摘要`
    同一个会话写一次 ID，发现之前已经写了 ID 和摘要，就基于这个 id 继续改写摘要，将之前的摘要和现在的汇总，比如 a 改为 b，又改为 c，那摘要就是 a 改成了 c，省去了中间跳动的过程
2. **事实轨 案卷**（命中任一即建）：排查超 3 轮 / 排除过错误方向 / 有权衡决策 / 跨多模块。记背景诉求、排查过程、关键决策、代码结论、涉及产物。如果同一个会话，涉及多个完全不同的场景，则在文件中用分隔符"---"分开写不同的场景。
文件名：`tasks/<会话ID>.md`

### Step 3 提交
代码与 `onememory/` 同批 `git add` + commit + `git push`（pre-commit 已门禁，禁止 `--no-verify`）。

### Step 4 海马记忆仓独立落盘（远端直写）
用 Step 1 的摘要，按「〇、海马记忆仓写入通道」直接写远端 `memory/<YYYY-MM>/<YYYY-MM-DD>.md`（存在则取 sha PUT 追加，不存在则新建；日期已在文件名，行内不重复；项目路径以 `~` 开头）：
`- HH:mm [~/项目完整路径] [会话ID] Step 1 的摘要`
偏好与画像同理走远端：稳定偏好追加 `personal/preferences.md`（一条一条，不按天）；长期画像整合进 `personal/profile.md`。
