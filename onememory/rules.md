# Project Rules Memory

（本文件记录行为规则与项目知识，上限 150 行，超限触发同类合并。）

## Entries

宪法与规则只做用户全局分发，禁止项目级软链
- Date: 2026-09-14
- Context: 讨论 Qoder 加载不到宪法时，用户否决我"顺手给项目根也链一份"的提议
- Instructions:
  - `one-agents.md`（宪法索引）一律经 `USER_GLOBAL_RULES` 分发到各 Agent 工具的用户级记忆文件，不得往任何项目根写 `AGENTS.md` / `CLAUDE.md`，也不得凭空生成 `one-context.md`
  - 每个工具的全局记忆位靠逆向/实测确认（读二进制里的加载器枚举逻辑，不信文档与猜测），确认结论以注释形式写进 `install.sh` 对应数组上方，供下次选型复用
  - 接入新 Agent 工具时只增删 `USER_GLOBAL_RULES` / `USER_GLOBAL_DIRS` 条目，不改分发流程
