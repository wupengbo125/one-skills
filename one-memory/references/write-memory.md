# 记忆沉淀指南 (Triple-Memory System)

记忆分两处：项目随身记忆 `<项目根>/onememory/`（项目规则 + 改动事实），跨项目记忆 `wupengbo125/one-hippocampus`（每日流水 + 个人偏好与画像）。

**硬约束**：不按本规范写记忆（缺时间/缺会话ID/同ID多行/漏落海马仓），提交会被仓库 pre-commit 钩子拦截，必须修正后重提。

---

## 〇、海马记忆仓写入通道（远端直写）

**海马记忆仓写入一律直接操作远端 `wupengbo125/one-hippocampus`（默认分支 main），不做本地 git、不写本地文件**（写入即自动 commit+push 远端）。查询仍走本地 clone（`~/onespace/github/one-hippocampus/`）。

写入：调用 **one-ghfile** skill（先读其 `SKILL.md` 按其方法执行），仓库 `wupengbo125/one-hippocampus`，分支 main

---

## 一、沉淀 SOP

改动代码/配置并自测通过后严格按序执行。

### Step 1 生成改动摘要
一句话写出本次改动做了什么、结论是什么，**上限 60 字，只写关键字**（查历史靠关键字定位，再按行首会话 ID 去 `onememory/tasks/<ID>.md` 看细节；ID 本身就是案卷指针，摘要末尾不用再写"详见"）。
流水与案卷均带上完整会话 ID。参考下面获取ID：
1. 第一优先级（自知）：上下文已注入 ID（如 OMP）→ 直接取用。
2. 第二优先级（探针）：查 $CODEBUDDY_SESSION_ID、$CLAUDE_SESSION_ID → 命中即用。
3. 兜底阻断（求助）：仍为空 → 硬中断，自嘲并向用户索取，彻底杜绝 Agent 编造假 ID 或跳过不写。

### Step 2 项目随身记忆 `<项目根>/onememory/`
1. **事实轨 流水**：向 `timeline.md` 末尾追加 Step 1 的摘要
   `- YYYY-MM-DD HH:mm [会话ID] Step 1 的摘要`  
    同一个会话写一次 ID，严禁为同一个会话的不同主题生成第二个ID，发现之前已经写了 ID 和摘要，就基于这个 id 继续改写摘要，将之前的摘要和现在的汇总，比如 a 改为 b，又改为 c，那摘要就是 a 改成了 c，省去了中间跳动的过程
2. **事实轨 案卷**（摘要 60 字装不下就建；另有排除过错误方向 / 有权衡决策 / 跨多模块也建）：记背景诉求、排查过程、关键决策、代码结论、涉及产物。如果同一个会话，涉及多个完全不同的主题，则在文件中用分隔符"---"分开写不同的主题。  
文件名：`tasks/<会话ID>.md`

### Step 3 海马记忆仓落盘（远端直写，必须在提交前完成）
按「〇、海马记忆仓写入通道」写远端 `memory/<YYYY-MM>/<YYYY-MM-DD>.md`（存在则取 sha PUT 追加，不存在则新建；日期已在文件名，行内不重复；项目路径以 `~` 开头）：
`- HH:mm [~/项目完整路径] [会话ID] Step 1 的摘要`

**等号铁律**：时间戳与项目路径之后的内容，必须与 Step 2.1 的 timeline 行**逐字照抄**（同一会话改写摘要时两边同改）；
pre-commit 会拉远端当日文件做整行等值比对，缺失或不一致均拒绝提交。

偏好与画像同理走远端：稳定偏好追加 `personal/preferences.md`（一条一条，不按天）；长期画像整合进 `personal/profile.md`。

### Step 4 提交
代码与 `onememory/` 同批 `git add` + commit + `git push`（pre-commit 已同时门禁 `onememory/` 与海马摘要等号，禁止 `--no-verify`）。交付时报一句"记忆已沉淀"。
