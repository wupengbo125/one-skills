# Handoff — one-todo 仲裁/审核

## Completed

- 提交已推送 `9ca9e94`（main）：赛马仲裁+单马审核系统、判官提示词带任务原文、四段式仲裁结论、结论一键发回会话、`HoldToLaunch duration 2000→1000`（`client/todo.tsx:76`）、README 同步；`onememory` 流水+案卷+远端海马仓已落盘；两轮 sub-agent 等号审查通过，`npm run typecheck` 通过。
- 模板文档轮（**未提交**，见 `git status` 6 个 M）：判官提示词模板只住一个文档（`~/.paseo/plugin-data/one-todo/judge.md`，仲裁/审核两段以分隔行切分）；弹层模板区显示全文、可改可存、脏检查拦开庭；开庭/读取共用 `readOrSeedTemplateRaw`（缺文件自动建）；`server/prompts/judge.md` 已删；代码零提示词。
- 结论文件保留走内部（用户拍板：底层照旧）；全链路去地址：README 路径全删、报错信息不带路径、模板用 `{{verdictFile}}` 占位、判官回复规则改为贴结论全文。
- 不自动发送（用户否决）：结论区发送按钮手动点（审核发那匹，仲裁发胜者）。

## Current state

- 进行中：等用户重进仲裁弹层，确认模板区正常显示（此前两版分别报过地址读错、缺自动建，均已修，typecheck 过）。
- 阻塞：无。确认显示正常后即可问是否提交（用户对提交问题一律先问再动）。

## Decisions & constraints

- 对话只说人话：不讲技术术语、不贴代码路径；用户极度反感“展示文档/地址”（弹层、说明、报错、判官回复里永不出现文件地址）。
- 改代码前必须 one-implement 平铺计划并经用户确认；未确认不得动文件、不得跑调研性工具（用户曾为此发火）。
- 只改 `one-skills` 内源；`npm run typecheck` 必过；RPC 类型用 `RpcOutput<typeof X>`。
- 真机上 `__dirname` 不可靠（曾解析到 `/home/ctyun`），运行时路径一律 `homedir()` 锚定。
- 仲裁与待办状态隔离；候选以 git worktree 按分支为权威；结论首行校验（仲裁 `胜者: N`，审核 `结论: 通过/不通过`）；agy 终端判官靠结论轮询+存活检查，连续 3 次查不到判失败。
- `handoff.md` 本文件不提交（草稿）。

## Next steps

1. 用户确认模板显示正常 → 问是否提交 → 走 one-memory（timeline+案卷+远端）→ commit → push。
2. 若模板仍异常：先看报错截图原文，再修 `server/arbitration.ts` 模板读写段（勿改整体结构）。
