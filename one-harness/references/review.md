# 双轴审查细则

主 Agent 执行 `git add -N .` 后取 `git diff HEAD`，并行派两个白板 Sub-agent：

## Sub-agent A — Standards 轴
- 输入：`git diff` + 项目规范（`AGENTS.md`）+ `skill://code-review`。
- 基线：全量执行 code-review 的 12 项 Fowler 坏味道（Mysterious Name, Duplicated Code, Feature Envy, Data Clumps, Primitive Obsession, Repeated Switches, Shotgun Surgery, Divergent Change, Speculative Generality, Message Chains, Middle Man, Refused Bequest）。项目规范优先，区分硬违规与启发式。
- 输出：独立 `## Standards`，逐项列违规行与建议；无问题报 PASS。

## Sub-agent B — Spec 轴
- 输入：`git diff` + 用户确认的计划清单与原话（一字不差透传）。
- 检查：① 需求遗漏；② 范围蔓延（Diff 里有用户没提的改动）；③ 实现错误。
- 输出：独立 `## Spec`，逐项列差异；无问题报 PASS。

## 准入
两轴独立输出，不合并。两轴皆 PASS 才进交付闸门；任一打回，把意见打包派回 Worker 修复，主 Agent 不自行改。
