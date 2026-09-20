# one-memory 记忆门禁系统 全局业务活蓝图 (Living Blueprint)

> **定位**：one-memory 技能的记忆门禁与校验逻辑真理源。纯粹记录业务规则与逻辑流转（坚决不写视觉 UI 样式），开发前用于对齐意图，开发中指导实现，开发后用于核对验收。

---

## 1. 系统定位与核心背景（AI 必须掌握的业务常识）

- **一句话定位**：通过本地 Git 钩子强制"代码改动与项目随身记忆（onememory/）原子提交 + 海马记忆仓摘要闭环"，杜绝改了代码不写记忆、写了记忆不守格式的漏记/错记。
- **关键背景与边界说明**：
  - **钩子源文件**：`one-memory/hooks/pre-commit`（唯一真源），经 `install-hook.sh` 安装到各仓库 `.git/hooks/pre-commit`。**改钩子只改源文件再重装，禁止直接改已安装副本**。
  - **查本地 clone**：海马仓校验一律查本地 `~/onespace/github/one-hippocampus`，**不依赖 gh api**（豆包环境 gh 未登录会误报）。
  - **记忆双轨**：项目随身记忆 `onememory/timeline.md`（单文件总流水）+ 全局海马仓 `one-hippocampus/memory/<YYYY-MM>/<YYYY-MM-DD>.md`（跨项目总账）。二者通过"同句摘要"闭环。
  - **格式规范（硬约束）**：timeline 行 = `- 日期 时间 [会话ID] 摘要`（日期+时间缺一不可，会话 ID 必带）；海马仓行 = `- 时间 [~/项目路径] [会话ID] 摘要`（项目路径必须以 `~` 开头）。
  - **人工绕过**：`git commit --no-verify` 可绕过门禁（钩子不拦人工显式绕过）。

---

## 2. 全景功能与业务逻辑地图 (Functional & Logic Map)

### 2.1 记忆门禁（pre-commit 钩子）

- **模块定位**：一次提交的入口守门人，只放行"带合规记忆的代码提交"。

#### 2.1.1 原子提交门禁（改代码必须同批带记忆）

- **使用者/角色**：所有在仓库执行 `git commit` 的 AI Agent 与人工终端。
- **触发条件 (Trigger)**：`git commit` 触发 pre-commit，且暂存区存在改动。
- **业务逻辑与流转 (Logic & Behavior)**：
  1. 提取暂存区改动文件列表，按 `onememory/` 前缀分组。
  2. 若存在非 `onememory/` 改动（代码等）**且**不存在 `onememory/` 改动 → 拦截。
  3. 若存在 `onememory/` 改动但无新增 timeline 记忆行 → 拦截。
- **预期结果 (Result)**：合法提交通过；漏记忆的提交被拒绝并提示"参考技能 one-memory"。
- **业务规则与边界 (Rules & Boundaries)**：
  - 只约束"有非记忆改动时"必须带记忆；纯记忆提交（无代码改动）不强制格式之外的校验。
  - 不检查历史行格式（历史不合格是历史原因，靠本次人工修复与后续严格拦截治理，钩子不追溯）。

#### 2.1.2 timeline 格式强检（缺时间/缺 ID 即拦）

- **使用者/角色**：写入 `onememory/timeline.md` 的 AI Agent。
- **触发条件 (Trigger)**：暂存区含新增 timeline 行。
- **业务逻辑与流转 (Logic & Behavior)**：对每条新增行执行正则校验：`- YYYY-MM-DD HH:MM [会话ID] 摘要`；时间、会话 ID、摘要任一缺失或格式不符 → 拦截并指出违规行。
- **预期结果 (Result)**：格式合规才允许提交；违规提交被拒绝，提示正确格式。
- **业务规则与边界 (Rules & Boundaries)**：
  - 会话 ID 必带，禁止伪造假 ID；无 ID 环境须先获取或按规程处理。
  - 时间必须是真实 `HH:MM`，禁止 `x` 等占位符。

#### 2.1.3 重复会话 ID 检查（同 ID 只一行）

- **使用者/角色**：写入记忆的 AI Agent。
- **触发条件 (Trigger)**：提交含 timeline 新增行，或海马仓本项目存在记录。
- **业务逻辑与流转 (Logic & Behavior)**：
  1. **timeline 全文**：提取所有会话 ID，出现次数 > 1 → 拦截，提示"同一会话只写一行，请合并摘要"。
  2. **海马仓当日本项目最近 5 条**：同会话 ID 出现次数 > 1 → 拦截，提示合并。
- **预期结果 (Result)**：杜绝同一会话在 timeline/海马仓产生多行碎片记录。
- **业务规则与边界 (Rules & Boundaries)**：
  - 合并动作由 AI 主动完成（保留全部内容、按时间排序连接），钩子只拦截不自动改。
  - 海马仓只查最近 5 条（容忍多端并发时他端刚写入的合法新条），不追溯全文。

#### 2.1.4 海马摘要闭环（timeline 末行须命中海马仓）

- **使用者/角色**：写入记忆的 AI Agent。
- **触发条件 (Trigger)**：提交含非记忆改动（即需沉淀记忆的提交）。
- **业务逻辑与流转 (Logic & Behavior)**：
  1. 取 timeline 末行摘要（剥离日期时间与 ID 前缀）。
  2. 取海马仓当日本项目最近 5 条记录（`grep -F "[~/项目路径]"` + `tail -5`）。
  3. timeline 末行摘要必须命中其中一条（子串匹配）→ 否则拦截。
- **预期结果 (Result)**：保证"项目随身记忆"与"海马总账"同一句话双处落盘，无遗漏。
- **业务规则与边界 (Rules & Boundaries)**：
  - 匹配为子串匹配（海马仓摘要可含 timeline 摘要的扩展内容）。
  - 海马仓以本地 clone 为准，写入方须先 `git pull` 最新再校验。

### 2.2 钩子安装与同步（install-hook.sh）

- **模块定位**：把钩子真源部署到各仓库，保证所有仓库行为一致。

#### 2.2.1 批量安装/重装钩子

- **使用者/角色**：AI Agent（修改钩子源文件后执行）。
- **触发条件 (Trigger)**：钩子源文件变更后运行 `bash one-memory/hooks/install-hook.sh`。
- **业务逻辑与流转 (Logic & Behavior)**：遍历 `~/onespace/github/*` 各仓库，将 pre-commit 复制到 `.git/hooks/`；one-hippocampus 额外装 post-commit（索引同步）。
- **预期结果 (Result)**：各仓库 `.git/hooks/pre-commit` 与源文件一致，新钩子立即生效。
- **业务规则与边界 (Rules & Boundaries)**：
  - 跳过列表（如 one-hippocampus 自身、one-life、one-llmwiki）按脚本约定处理。
  - 必须物理复制，禁止软链接。

---

## 3. 全局演进记录 (Roadmap & Status)

- [x] **已落地功能**：原子提交门禁；timeline 格式强检（日期+时间+ID）；timeline 全文重复 ID 检查；海马仓最近 5 条重复 ID 检查；海马摘要闭环（查本地 clone）；install-hook.sh 批量安装。
- [x] **历史治理（一次性）**：已手工合并 timeline 与海马仓历史重复会话 ID（01a08ba7 / 01a0af6f / 01a0afa4 / 01a0ba83），此后由钩子严格拦截防止再犯。
- [ ] **规划中**：无（钩子逻辑已收敛，按需微调）。
