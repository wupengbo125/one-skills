# 将 Markdown 摄入到 Wiki 中

将已接受的 Markdown 源文件编译入持久的个人 Wiki 中。首次构建和以后的每次更新都使用相同的操作。

## 规范个人知识模型

当 Markdown 证据使其相关时，维护以下 OpenWiki 规范页面：

- `onewiki/index.md`：导航和当前高级状态。强调已确认和受到强力支持的知识；链接出去以了解细节。
- `onewiki/open-questions.md`：关于用户的知识库或记忆模型的未解决不确定性，可能会损害未来的协助。
- `onewiki/themes.md`：重复出现主题和趋势的紧凑索引，而不是叙事性源摘要。
- `onewiki/commitments.md`：具体的工作任务、批准、决策、计划工作和后续行动，在证据支持时附带所有者和状态。
- `onewiki/personal-logistics.md`：预约、旅行、家务、生活管理截止日期和其他非工作后勤。
- `onewiki/sources/<source>.md`：必须保留特定源上下文时的紧凑出处和证据覆盖。规范解释仍然属于领域页面。

仅在存在相关证据时创建或更新这些页面。不要仅仅因为在此处命名了它们就创建空的规范文件。

### 开放问题 (Open questions)

- 仅为真实的知识缺口、模糊关系、矛盾、不清晰的例程、缺失的偏好或未来协助所需的上下文添加开放问题。
- 不要将源文档中找到的每个未解决问题或 TODO 复制到 `open-questions.md` 中。
- 将相关的不确定性归类在一个稳定的主题键（topic key）下，而不是为同一主题创建重复的问题。
- 使用 `Active`（活跃）、`Answered`（已回答）和 `Stale`（陈旧）章节。移动问题时保留原始问题，并记录决定性证据或陈旧原因和日期。
- 当新证据回答了一个活跃问题时，将其移动到 `Answered` 并链接规范答案或支持证据。

使用这种紧凑的形状：

```markdown
# Open Questions

## Active
### <topic-key>: <question>
- Owner: <person/team/unknown>
- Seen: YYYY-MM-DD
- Evidence: <short source references>

## Answered
### <topic-key>: <original question>
- Evidence: <canonical answer or source>
- Answered: YYYY-MM-DD

## Stale
### <topic-key>: <original question>
- Why: <short reason>
- Last seen: YYYY-MM-DD
```

### 主题 (Themes)

- 保持 `themes.md` 紧凑。优先选择包含主题键、信号、首次发现、最后发现、置信度、源文件、证据数量、状态和简短证据的表格。
- 将主题视为重复出现的信号，而不是详细的解释。将持久细节放在规范领域页面上并链接到那里。
- 更新现有主题，而不是追加相同模式的第二个描述。
- 仅当弱证据重复出现、具有源多样性或受到一个权威源的有力支持时，才升级弱证据。

### 承诺与后勤 (Commitments and logistics)

- 当需要跨主题的规范视图时，将工作承诺、决策、批准、计划工作和后续行动路由到 `commitments.md`。
- 仅在证据允许分类时将所有者记录为 `me`、`team`、`other:<name>` 或 `unknown`。
- 将个人预约、旅行、杂务、家务和生活管理截止日期路由到 `personal-logistics.md`，并在可用时保留日期、时间、地点和状态。
- 不要将信息性笔记、收据、促销、例行通知或推测性可能性转化为承诺。

### 跨源合成 (Cross-source synthesis)

- 使用稳定的主题键或 Slugs 去重重复出现的项目、人员、组织、决策、问题和承诺。
- 保持源页面作为出处索引；使领域页面成为跨源共享的持久知识的规范归宿。
- 当证据改变规范事实时，更新每个受影响的关系和索引，而不是保留不兼容的重复项。

## 发现 (Discovery)

1. 检查 `raw/` 下的每个 `.md` 文件、现有的 `raw/<topic>/` 结构以及 `onewiki/` 下的现有页面（遵循 `common.md` 中关于前置 `git pull` 的规则）。忽略所有非 Markdown 文件。
2. 将直接位于 `raw/` 下的 `.md` 文件视为未分类的收件箱项目。从持久内容中推断一个主要主题，优先选择现有主题。将低置信度项目留在收件箱中，并列出候选主题及其不确定性原因。
3. 如果 Wiki 尚无实质性规范页面，请使用引导路径：在所有已接受的证据中，盘点重要的领域、源文件、项目、人员、工作流、决策、关系、矛盾和开放问题。
4. 否则使用增量路径：运行 `git diff --name-only <last_ingest_commit> HEAD -- raw/` 和 `git status -s raw/` 以仅检查 `raw/` 下已变更的 Markdown 源文件。将变更的证据与 Wiki 进行对比，并识别新的持久知识、变更或作废的断言、已解决或新的矛盾、陈旧的不确定性以及需要修订的关系。在存在 Diff 时避免全量扫描。完成后更新 `onewiki/index.md` 中的 `last_ingest_commit`。
5. 在提出替换建议之前检查现有的规范页面。保留无关的准确内容和确立的术语。仅当页面不再具有剩余证据或独立价值时才提出删除页面的建议。

## 摄入计划 (Ingest plan)

设计最小且完整的规范页面变更集。禁止输出冗余重复的物理路径与主题列，向用户呈现极简的 3 列确认表格：

```markdown
| 源文件 | 分类 | 核心提炼与变更 |
|---|---|---|
| `<filename>.md` | `<topic>` | 提炼核心要点，新建/更新概念或摘要 |
```

保持信息极简达意。如果证据未添加持久知识且 Wiki 是准确的，则报告 No-op 且不写入任何内容。否则暂停等待一次用户确认。

## 写入 (Writing)

确认之后：

1. 仅执行已批准的源文件移动和 Wiki 编辑。
2. 将证据整合入规范解释中，而不是追加零散不连贯的笔记。
3. **原文出处双链**：在生成的每个摘要页 (`summaries/*.md`) 或来源页头部，必须包含指向 `raw/<topic>/<filename>.md` 的绝对/相对双链（例如 `> 源文件：[[../../raw/<topic>/<filename>.md|查看原文]]`），使用户可以在 Obsidian 中一键点开或内嵌预览原始 Markdown 全文。
4. 将可信的冲突保留为争议中，并且仅在证据支持解决时才解决开放问题。
5. 仅当实质性知识区域没有适当的规范归宿时才创建页面。
6. 更新受影响的语义链接、`onewiki/<topic>/index.md` 文件、`onewiki/index.md` 和图表。
7. 在所有其他计划的变更成功后，将批准的摄入条目追加到 `onewiki/log.md` 中。

## 复核与自动推送 (Review)

将最终的树与摄入计划进行对齐，并检查变更揭示的相邻规范页面。确保接受的源文件具有主主题，持久知识具有规范归宿，作废的断言得到显式处理，链接解析，且导航完整。

删除冗余和低价值存根，更新 `onewiki/index.md` 中的 `last_ingest_commit`，并执行 `common.md` 中定义的自动 Git 提交与远程推送全流程（`git add` ➔ `git commit` ➔ `git push`）。

完成意味着持久 Wiki 准确合并了所有已接受的 Markdown 证据，且变更已由 Git 自动提交与同步推送至远端。
