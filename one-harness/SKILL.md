---
name: one-harness
description: "代码开发与重构流程（主架构 + Worker + 双轴审查 + 蓝图同步）。"
argument-hint: "需求描述、修改说明或需求文档路径"
disable-model-invocation: true
---

# 代码开发与实施流程 (Implementation & Workflow)

编写、修改、重构代码时的**唯一总入口**。
核心原则：**主 Agent 是纯架构者（Architect），只负责设计与派活，绝不亲自写业务代码；改动功能必须同步更新全局活蓝图。**

---

## 核心分工与流程

```
用户提需求 / 自然对话更新需求
   │
   ▼
1. 架构与边界（主 Agent：提取 Target & Non-Goals，检索全局活蓝图，严禁亲自改代码）
   │
   ▼
2. 隔离实现（派 Worker Sub-agent：全新独立上下文，编码 + 同步更新活蓝图，CP模式防瞎写）
   │
   ▼
3. 测试验证（Worker Sub-agent 运行针对性测试验证）
   │
   ▼
4. 双轴审查（按 code-review 规范派 Sub-agent A & B 并行查 Git Diff）
   ├── Sub-agent A（Standards 轴）：继承 code-review 完整 12 项坏味道与项目规范
   └── Sub-agent B（Spec & Blueprint 轴）：查范围蔓延、实现吻合、蓝图同步锁定
   │
   ▼
5. 交付闸门（主 Agent 验收：确认代码与蓝图同步更新无误，写海马体记忆，Commit 并交付）
```

---

## 一、主 Agent 的架构者职责（改代码前）

1. **绝对禁令**：主 Agent **严禁直接编辑或写入业务代码**，防止主会话上下文被大量文件代码爆破。
2. **意图锚定**：
   - 从用户的日常自然对话或文档中，提炼出清晰的 **Target（必做目标）** 与 **Non-Goals（严禁扩展项）**。
   - 拒绝死板八股文盘问，快速收拢边界进入实现。
3. **全局活蓝图接入 (Living Blueprint)**：
   - 自动检测项目全局活蓝图（优先路径：根目录 `BLUEPRINT.md`，其次 `docs/BLUEPRINT.md`）。
   - 将蓝图中的相关业务上下文提取并注入给 Worker，命令 Worker：**修改代码的同时必须同步更新蓝图，作为同一次 Commit 交付！**

---

## 二、派发 Worker Sub-agent 实现（改代码中）

主 Agent 通过 Sub-agent 工具启动一个**全新的独立工作代理（Worker）**，在 Prompt 中注入任务边界与以下《编码实施守则》：

### 1. 代码-蓝图强同步铁律 (Code-Blueprint Lockstep)
- **改代码必改蓝图**：任何业务功能的增加、逻辑调整、规则变更或删除，**修改全局蓝图（`BLUEPRINT.md`）是 Worker 的法定必交工作**。
- **纯逻辑无 UI**：更新蓝图时严格遵循 `one-blueprint` 规范，只记录业务逻辑、触发时机、流转与规则边界，不写视觉 UI 样式。
- **防文档腐化**：坚决杜绝“代码跑通了但蓝图还是老的”；若项目暂无蓝图，Worker 负责顺手初始化骨架并写入本次功能。

### 2. 精准修改与重构防瞎写 (Surgical Changes & CP Mode)
- **改 A 只改 A**：严禁借机顺手格式化或重构未要求的邻近文件。
- **严禁投机抽象 (No Speculative Generality)**：绝不为了“未来可能用”预留通用类、多余参数或工厂。
- **标准库优先**：能用一行原生解决的，绝不封装 50 行。
- **CP 物理剪贴板优先（/one-refactor-implement-cp）**：涉及已有代码的合并、迁移、重构与拆分时，**绝对禁止凭记忆 hand-type 重写大段代码**（极易脑补出逻辑 Bug）。必须通过物理复制文件（`cp`/`mv`）作为基准，或按行号物理抽取插入，只做微创修改。

### 3. 至简至上 (Simplicity First)
- 使用ponytail技能去做精简
- **拒绝防御性代码**：环境已知、文件必存时，直接操作，不写多余 `try-catch`。
- **拒绝多层兜底**：不写“A 不行试 B，B 不行试 C”；直接用正统 A，挂了直接修 A。
- **绝对路径**：优先使用明确的 `~/` 路径，避免脆弱环境变数。

### 4. Python 项目三件套规约（按需加载）
- **按需读取**：若涉及 Python 工具/子项目开发，按需读取 [references/python-structure.md](references/python-structure.md) 遵循标准三件套规范；非 Python 项目绝不加载。

Worker Sub-agent 完工后仅向主 Agent 返回简短执行总结（改动文件、测试结果、蓝图同步情况），主会话上下文保持绝对干净。

---

## 三、派发 Sub-agent 双轴审查（改代码后）

代码写完后，主 Agent **绝不肉眼看代码**。先执行 `git add -N .` 纳入新文件，提取 `git diff HEAD`（若已有多 commit 则用基准点对比），并行启动两个白板 Sub-agent 执行审查（可直接读取 `skill://code-review`）：

### 1. Sub-agent A（Standards 轴：代码规范与坏味道）
- **输入**：`git diff` + 项目规范（`constitution.md` / `AGENTS.md`）+ `skill://code-review`。
- **基线检查**：全量执行 `code-review` 的 12 项 Fowler 坏味道基线（Mysterious Name, Duplicated Code, Feature Envy, Data Clumps, Primitive Obsession, Repeated Switches, Shotgun Surgery, Divergent Change, Speculative Generality, Message Chains, Middle Man, Refused Bequest）。项目规范优先，区分硬违规与启发式判断。
- **输出格式**：独立 `## Standards` 报告，逐项列出违规行与精简建议；无问题报 PASS。

### 2. Sub-agent B（Spec & Blueprint 轴：需求符合与蓝图同步）
- **输入**：`git diff` + 原始需求（Target & Non-Goals）+ 全局活蓝图。
- **核心检查**：
  - **蓝图同步必检**：Diff 中是否包含全局活蓝图同步？**改了功能却没改蓝图 ➔ 直接打回 REJECT**。
  - **反范围蔓延**：Diff 里是否存在用户没提的额外改动？
  - **实现完整与正确性**：Target 是否全部落实，行为是否与需求画等号？
- **输出格式**：独立 `## Spec & Blueprint` 报告，逐项列出差异与遗漏；无问题报 PASS。

### 3. 两轴独立准入与打回
- 两轴独立输出，严禁合并折中。
- 仅当两轴皆为 PASS 时，方准进入交付闸门。任一轴打回：主 Agent 将具体意见打包派给 Worker 修复，严禁主 Agent 自行脑补改动。

## 四、失败处理与最终交付（主 Agent 闸门）

1. **被打回**：主 Agent 重新唤醒 Worker Sub-agent，命令其补正蓝图或剔除违规代码，修完重新 Review。
2. **交付闸门**：
   - Review 全部通过后，主 Agent 记录今日海马体记忆并同步索引。
   - 本地 `git commit`（包含代码与蓝图更新）并 `git push`。
   - 向用户极简交付结果。
