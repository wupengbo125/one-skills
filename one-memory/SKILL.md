---
name: one-memory
description: "海马体记忆系统：管理AI记忆，每日流水与用户偏好，可读写记忆，涉及用户喜好/习惯/历史决策时查用；'收工'兜底补记。记笔记禁用此Skill"
---

# One Memory (海马体记忆系统)

数据仓为 GitHub 远端仓库 `wupengbo125/one-hippocampus`（默认分支 main）。查询走本地 clone（`~/onespace/github/one-hippocampus/`），写入直接操作远端。

## 读写通道

**写入一律直接操作远端，不做本地 git、不写本地文件**（写入即自动 commit+push 远端）：
- 通道一（优先，豆包环境）：github-remote MCP。读：`get_file_contents`；写/改：`create_or_update_file`（更新已有文件必须带当前 sha，从 `get_file_contents` 取；远端默认分支为 main，`branch` 参数填 `main`）。
- 通道二（兜底，其他 AI / 其他电脑）：`gh api`（gh 已登录自动认证）。写/改两步：先 GET 取当前文件 `.sha`（新建文件无此步），内容 base64 后 PUT 到 `main` 分支，更新必须带 sha。

**查询仍在本地进行**：检索、列流水、读偏好/画像，一律走本地 clone，规则见 [references/search-memory.md](references/search-memory.md)。

## 意图分流

- **查记忆 / 历史流水 / 用户画像 / 查偏好 / 查历史任务**：
  - 用户说法开放（"查记忆"、"找一下之前做了什么"、"查偏好"等皆可），识别意图即可；规则与脚本见 [references/search-memory.md](references/search-memory.md)
- **修改文件/配置后记忆沉淀（自动记忆；"收工"为兜底）**：
  - 写入远端 `memory/<YYYY-MM>/<YYYY-MM-DD>.md` 单向追加、`preference.md` 追加、`system/profile.md` 更新；规则见 [references/memory.md](references/memory.md)
- **获知用户稳定偏好（自动行为，无需用户开口）**：
  - AI 发现用户表达了新的稳定偏好（如"以后都…""我喜欢…"）时，自动追加 `personal/preferences.md`，一条一条，不按天
  - 分流判定：关于用户本人的稳定偏好/画像 → 海马体 `personal/`（零散偏好追加 `personal/preferences.md`，长期画像整合进 `personal/profile.md`）；只在某个项目内有效的干活规则 → 该项目 `onememory/rules.md`
- **项目级行为规则沉淀（规则轨；每条用户输入都校验，进入项目先读）**：
  - **每一条**用户输入都要对照**触发条件**校验；命中后**必须立即**先对照排除清单检查，确认不属于排除范围，再更新当前项目根目录的 `onememory/rules.md`：
    1. 用户给出关于行为模式的明确指示
    2. 用户指示或纠正助手行为
    3. 用户表达偏好的实现方式
    4. 用户说明期望的任务执行方式
    5. Agent 在任务执行过程中主动发现项目知识
  - 完整规则、排除清单、示例与文件骨架见 [references/rules-memory.md](references/rules-memory.md)
  - 若 `onememory/rules.md` 已存在，**必须**在首次回复之前作为项目级指令读取；若不存在，则在首次尝试记录内容时按文件骨架创建（标题行、一行说明、`## Entries` 标题）并追加本次条目（见 [references/rules-memory.md](references/rules-memory.md)）。

## 禁止
- 用户说"记笔记"绝对禁止使用这个技能——记笔记走 one-wiki 个人知识库；
- 海马体写入禁止本地 git add/commit/push，禁止写本地文件（查询除外）。
