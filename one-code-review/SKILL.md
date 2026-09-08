---
name: one-code-review
description: "Use when: 审查代码变更。默认对比工作区与上次提交的差异(git diff HEAD)，自动对齐项目全局活蓝图(BLUEPRINT.md)，双Sub-agent独立审查质量与范围。"
argument-hint: "[diff范围] [参考文档路径]"
---

# Code Review

审查代码变更，两个独立轴并行检查，互不干扰。
完全基于 Git Diff 与项目全局活蓝图，拒绝多余提问，开箱即审。

---

## 两个审查轴

### 1. 代码质量与反过度设计 (Standards)
检查代码本身的质量问题，内置 Fowler 坏味道与 Matt Pocock 规则。
重点严查：
- **Speculative Generality**（投机抽象、过度设计、预留未来无用参数/类）
- **Middle Man / Duplicated Code**（无效中间件、空套壳、重复逻辑）

### 2. 需求符合与反范围蔓延 (Scope)
检查代码变更是否与需求/全局活蓝图严格对齐：
- 是否存在未要求的文件改动或自作主张的“顺手重构”（Scope Creep）。
- 需求要求的核心目标是否全部落地。

---

## 自动化审查流程

### 1. 确定 Diff 范围
默认直接提取：工作区未提交的改动，即 `git diff HEAD`。
用户指定范围时（如 `HEAD~1`、`main...HEAD`），以用户指定为准。

### 2. 自动检索参考基准（无需询问用户）
1. 若用户在参数中显式指定了文档路径 ➔ 直接作为参考基准。
2. 若未指定，自动检测项目是否存在全局活蓝图：
   - 根目录 `BLUEPRINT.md`
   - `docs/BLUEPRINT.md`
3. 找到则自动作为需求符合轴的对比基准；若项目中不存在任何蓝图，则跳过需求轴，仅执行代码质量轴审查。

### 3. 并行双 Sub-agent 审查

派发两个全新的独立 Sub-agent：

- **Sub-agent A（代码质量轴）**：
  - 收到完整 diff。
  - 检查坏味道基线：Mysterious Name, Duplicated Code, Speculative Generality, Middle Man, Shotgun Surgery 等。
  - 报告：定位到具体文件和行号，指出硬性违规或优化点。

- **Sub-agent B（需求与范围轴）**：
  - 收到完整 diff 与检测到的全局活蓝图。
  - 报告：(a) 缺失功能；(b) 范围蔓延（未经要求的私自改动）；(c) 与蓝图不一致之处。引用原文档条款。

### 4. 汇总与输出

两个 Sub-agent 的报告分别输出在 `## 代码质量` 和 `## 需求与范围` 下，末尾给出一行极简判定：
- 是否通过（PASS / REJECT）
- 核心修改意见（如有）
