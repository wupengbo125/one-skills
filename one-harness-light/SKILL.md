---
name: one-harness-light
description: "轻量开发流程：改任何文件自动触发。若已调用重型one-harness则不触发。"
argument-hint: "用户需求描述"
---
# 轻量开发流程 (Harness Light)

改任何文件时自动触发的轻量审查流程。若本会话已调用重型 `one-harness`，则本流程不触发。

---

## 流程

### 1. 改代码前

确保仓库干净（`git status` 无未提交改动），这样后续 diff 才有意义。

### 2. 主 Agent 自己写代码

不派 Worker，主 Agent 直接改。只改用户需求里的东西，不动其他。

### 3. 写完不提交

代码改完后**不要 commit**，保持工作区有改动。

### 4. 派 Sub-agent 审查

派一个全新的 Sub-agent，给它两样东西：

- **用户原始需求**（Target &amp; Non-Goals）用户的所有原话，绝对禁止给出你理解的需求
- `**git diff HEAD**`（最后一次提交到当前的全部改动）

Sub-agent 只查一件事：**需求和改动是否画等号**

- 改多了？（Diff 里有用户没提的改动）
- 改少了？（用户提了但 Diff 里没有）
- 功能一致吗？（实现的和需求说的是一回事吗）

Sub-agent 无记忆、拿需求文档看，最准确。

### 5. 审查结果

- **通过** → 进入第6步
- **不通过** → 主 Agent 修完，回到第4步重审

### 6. 判断是否更新蓝图

主 Agent 自己判断：本次改动是否涉及功能/规则/逻辑变化？

- 是 → 同步更新全局活蓝图（`BLUEPRINT.md` 或 `docs/BLUEPRINT.md`）
- 否（变量名、格式、注释等微小改动）→ 跳过

### 7. 提交

`git commit` + `git push`，极简交付。

