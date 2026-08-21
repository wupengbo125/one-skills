---
name: one-code-review
description: "Use when: 审查代码变更。默认对比工作区与上次提交的差异，支持用户指定 diff 范围和参考文档。"
argument-hint: "[diff范围] [参考文档路径]"
---

# Code Review

审查代码变更，两个独立轴并行检查，互不干扰。

---

## 两个审查轴

### 代码质量

检查代码本身的质量问题：命名、重复、结构、坏味道等。内置 Fowler 代码坏味道基线，项目有额外规范时项目优先。

### 需求符合

检查代码变更是否符合用户提供的参考文档（需求、设计、issue 等）。没有参考文档时跳过此轴。

---

## 流程

### 1. 确定 diff 范围

默认：工作区未提交的改动，即 `git diff HEAD`。

用户可以指定其他范围，比如：
- `HEAD~3`（对比 3 次提交前）
- `main...HEAD`（从 main 分支到现在）
- 任何 git ref 或 range

确认 diff 非空后再继续。

### 2. 确定参考文档

询问用户是否有参考文档（需求、设计稿、issue 等）。

- 有 → 读取该文档内容
- 没有 → 只跑代码质量审查，需求符合轴跳过

### 3. 并行审查

**代码质量 sub-agent**：
- 收到完整 diff
- 收到项目编码规范（如有 CODING_STANDARDS.md、CONTRIBUTING.md 等）
- 按以下坏味道基线逐条检查，项目规范优先于基线：
  - Mysterious Name（命名不清）
  - Duplicated Code（重复逻辑）
  - Feature Envy（方法过度依赖其他对象的数据）
  - Data Clumps（同样的字段总是一起出现）
  - Primitive Obsession（用原始类型代替领域概念）
  - Repeated Switches（同样的 switch/if 级联反复出现）
  - Shotgun Surgery（一个改动需要改很多文件）
  - Divergent Change（一个文件因多个不相关原因被改）
  - Speculative Generality（为不存在的需求做抽象）
  - Message Chains（过长的链式调用）
  - Middle Man（只做转发的中间层）
  - Refused Bequest（子类忽略大部分继承内容）
- 报告：每个问题引用具体文件和行，说明是硬性违规还是主观判断

**需求符合 sub-agent**：
- 收到完整 diff
- 收到参考文档内容
- 报告：(a) 文档要求但缺失的功能；(b) 文档没要求但多出来的改动（范围蔓延）；(c) 看似实现但实际有误的地方。引用文档原文。

### 4. 汇总

两个报告分别放在 `## 代码质量` 和 `## 需求符合` 下，不合并不重排。

末尾一行总结：每个轴的问题数量和最严重的问题。
