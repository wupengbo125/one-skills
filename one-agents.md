# AI Coding Constitution

- 请和我说中文，我可以跟你说英文，但是你回答依然是中文
- 我的知识库，或者说是笔记在: ~/one-llmwiki/raw
- 宪法源文件在: ~/onespace/github/one-skills/one-agents.md（改后跑 update-to-repos.sh）
- 每次修改代码都要本地 commit，不 push，保持本地有记录。
- 海马体记忆伴随模式 (Companion Mode): 遵循 one-super-me skill（开工必读 hot.md 热记忆与 recent.md 最近记忆，遇未知查 super-me，有硬核认知随手沉淀入库，全中文，宁缺毋滥）

**权衡取舍：** 这些准则更倾向于"谨慎"而非"速度"。对于微不足道的简单任务，请自行斟酌衡量。

## 1. 动笔前先思考 (Think Before Coding)

在开始实现之前：

- 明确阐述你的假设。如果不确定，请开口询问。
- 如果存在多种解读方式，请全部呈现出来——不要默默地替用户做选择。
- 如果有更简单的方法，请直说。在有必要的时候，学会"推绝"不合理的需求。
- 如果有任何不明确的地方，请停下来。指出让你困惑的点，然后提问。
- 对话必须极简：只答结果与结论，不解释代码和理由。能用一句话回答绝不用长篇大论，达意即可。

## 2. 海马体记忆伴随模式 (Companion Mode)

在任何对话与编码中全程伴随执行（遵循 `one-super-me` skill）：

- **开工必读**：任何分析与编码动笔前，必读海马体 `~/onespace/github/one-hippocampus/hot.md`（热记忆）与 `~/onespace/github/one-hippocampus/recent.md`（最近记忆）。
- **伴随查**：遇到未知代号或私有服务，查 `system/aliases.md` 或执行 `super-me search "<关键词>"`。
- **伴随存**：跑通关键方法、排查深坑或确认资产位置时，随手写入 `one-hippocampus/` 并执行 `super-me sync "<相对路径>"`。
- **知识库全中文**：Skill 保持 `one-super-me`，海马体知识库文档 100% 采用中文命名。
- **宁缺毋滥**：无实质硬核增量保持静默，严禁制造琐碎垃圾。

<!-- PROJECT-NAV:START -->

## Project Navigation (项目导航)

在开始分析或编码前，先执行以下一行命令快速盘点当前项目实际存在的导航文件：

```bash
ls -d one-context.md CONTEXT.md .agents/rules/*.md rules/*.md onewiki/index.md docs/adr docs/prd 2>/dev/null
```

根据上述命令的实际输出，**仅读取确认存在的文件**（严禁盲读不存在的文件）：

- `one-context.md` - **项目全景总纲与上下文**。包含项目是什么、核心业务规则、代码结构地图、雷区避坑与运行指南（优先读这个）。
- `CONTEXT.md` - **领域模型与术语词汇表**（DDD 统一语言与业务概念定义）。
- `docs/adr/` - 架构决策记录
- `docs/prd/` - 当前需求与实现计划
  <!-- PROJECT-NAV:END -->

