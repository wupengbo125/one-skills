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

「移植/改成另一种语言」= 替换，不是并存
- Date: 2026-09-18
- Context: 用户要求把 one-orca-race 的 race.py 改成 shell 脚本，我保留了 race.py 与新脚本并存，被明确斥责（"迁移和复制是两个概念"）
- Instructions:
  - 用户说"移植 / 迁移 / 改成 X"时，必须删除旧实现，仓库里只留一份
  - 不要为了"稳妥"保留旧文件、也不要额外复制出多份入口
  - 旧实现若已入库，删除即可，需要时 `git checkout` 可恢复
