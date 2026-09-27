# 案卷 [2fa94a92-ea6e-4bcf-b91f-781b5bada9e4]

## 背景诉求
- 按 one-writing-skill 规范重写 one-lorebloom：正面表述、补完成标准、接入 fts、用 compiler 引导词。
- 页面类型补 projects（我的项目）；concept 抽取加门槛（可复用/跨资料才建页）。
- raw 去掉 ingested 层，按领域归档；删 AGENTS.md，规则全收进技能。

## 关键决策
- raw/ 根=待摄入，raw/<领域>/=已摄入，领域目录即标记。
- 页面四类型：concepts/entities/projects/summaries。
- 仓库错位页面归位：Carefree/Paseo插件→projects，正念/站桩/peg→concepts。

## 涉及产物
- lorebloom 仓库：删 AGENTS.md、raw 重组、页面归位、index 重建。
- PR #8 分支：SKILL.md + 4 references 全量重写。
