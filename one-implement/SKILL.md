---
name: one-implement
description: "编写、修改、重构代码或开发功能时使用。架构者模式：主Agent只做设计与分发，严禁亲自写业务代码；无缝连接项目全局活蓝图(PRD/BLUEPRINT)；派发Worker Sub-agent隔离写代码(支持CP物理剪贴板防瞎写)，派发双Reviewer Sub-agent严查Git Diff。"
argument-hint: "需求描述、修改说明或需求文档路径"
---

# 代码开发与实施流程 (Implementation & Workflow)

编写、修改、重构代码时的**唯一总入口**。
核心原则：**主 Agent 是纯架构者（Architect），只负责设计与派活，绝不亲自写业务代码。**

---

## 核心分工与流程

```
用户提需求 / 自然对话更新需求
   │
   ▼
1. 架构与边界（主 Agent：提取 Target & Non-Goals，检索全局活蓝图，严禁亲自改代码）
   │
   ▼
2. 隔离实现（派 Worker Sub-agent：全新独立上下文，戴锁编码；重构必须执行 CP 剪贴板优先，防 AI 脑补瞎写）
   │
   ▼
3. 测试验证（Worker Sub-agent 运行针对性测试验证）
   │
   ▼
4. 双轴审查（派 Reviewer A & B 两个全新 Sub-agent 并行查 Git Diff）
   ├── Reviewer A（Standards 轴）：查过度设计、投机抽象、坏味道
   └── Reviewer B（Scope 轴）：查范围蔓延、未要求改动、自作主张、蓝图对齐
   │
   ▼
5. 交付闸门（主 Agent 验收：核对无误写海马体记忆，Commit 并交付）
```

---

## 一、主 Agent 的架构者职责（改代码前）

1. **绝对禁令**：主 Agent **严禁直接编辑或写入业务代码**，防止主会话上下文被大量文件代码爆破。
2. **意图锚定**：
   - 从用户的日常自然对话或文档中，提炼出清晰的 **Target（必做目标）** 与 **Non-Goals（严禁扩展项）**。
   - 拒绝死板八股文盘问，快速收拢边界进入实现。
3. **全局活蓝图接入 (Living Blueprint)**：
   - 自动检测项目是否存在全局功能蓝图（优先路径：`docs/prd/BLUEPRINT.md`，其次根目录 `PRD.md`）。
   - 若存在，将蓝图路径作为 Worker 的全局参照基准。若本次改动涉及项目功能的增删改，明确告知 Worker 在交付代码的同时**同步更新蓝图对应章节**，保持蓝图永久存活。

---

## 二、派发 Worker Sub-agent 实现（改代码中）

主 Agent 通过 Sub-agent 工具启动一个**全新的独立工作代理（Worker）**，在 Prompt 中注入任务边界与以下《编码实施守则》：

### 1. 至简至上 (Simplicity First)
- **拒绝防御性代码**：环境已知、文件必存时，直接操作，不写多余 `try-catch`。
- **拒绝多层兜底**：不写“A 不行试 B，B 不行试 C”；直接用正统 A，挂了直接修 A。
- **绝对路径**：优先使用明确的 `~/` 路径，避免脆弱环境变数。

### 2. 精准修改与重构防瞎写 (Surgical Changes & CP Mode)
- **改 A 只改 A**：严禁借机顺手格式化或重构未要求的邻近文件。
- **严禁投机抽象 (No Speculative Generality)**：绝不为了“未来可能用”预留通用类、多余参数或工厂。
- **标准库优先**：能用一行原生解决的，绝不封装 50 行。
- **CP 物理剪贴板优先（/one-refactor-implement-cp）**：涉及已有代码的合并、迁移、重构与拆分时，**绝对禁止凭记忆 hand-type 重写大段代码**（极易脑补出逻辑 Bug）。必须通过物理复制文件（`cp`/`mv`）作为基准，或按行号物理抽取插入，只做微创修改。
- **活蓝图同步**：若功能有增删改，必须同步在全局蓝图（`BLUEPRINT.md` / `PRD.md`）上更新功能全景描述。

Worker Sub-agent 完工后仅向主 Agent 返回简短执行总结（改动文件、测试结果、蓝图更新情况），主会话上下文保持绝对干净。

---

## 三、派发 Reviewer Sub-agent 双轴审查（改代码后）

代码写完后，主 Agent **绝不肉眼看代码**，而是派发两个独立的 Reviewer Sub-agent 直接审查 `git diff HEAD`：

### 1. Reviewer A（Standards 轴：代码质量与反过度设计）
- 严查 **Speculative Generality**：是否偷塞了未要求的通用抽象？
- 严查 **Duplicated Code / Middle Man**：是否有冗余函数与套壳中介？
- 发现过度设计 ➔ **打回**。

### 2. Reviewer B（Scope 轴：需求符合与反范围蔓延）
- 拿主 Agent 第 1 步的 Target/Non-Goals 及项目全局蓝图当尺子：
  - Diff 里的改动，用户提了吗？改了不相干的文件 ➔ **打回**。
  - 是否有未授权的顺手优化 ➔ **打回**。
  - 核心目标是否全部落地？有漏做 ➔ **打回**。
  - 蓝图与实际改动是否对齐？有遗漏更新 ➔ **打回**。

---

## 四、失败处理与最终交付（主 Agent 闸门）

1. **被打回**：主 Agent 重新唤醒 Worker Sub-agent，命令其删除多余改动或补正蓝图，修完重新 Review。
2. **交付闸门**：
   - Review 全部通过后，主 Agent 记录今日海马体记忆并同步索引。
   - 本地 `git commit` 并 `git push`。
   - 向用户极简交付结果。
