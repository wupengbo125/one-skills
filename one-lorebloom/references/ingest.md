# 摄入 (ingest)

扫描收件箱 `raw/` 根目录，把原始资料编译入知识层 `lorebloom/<领域>/`，随后原文按月归档。
**本地通道**：读写 `~/onespace/github/lorebloom`，完成后 commit + push。

## 步骤

1. **拉取最新**：`cd ~/onespace/github/lorebloom && git pull`

2. **扫描收件箱**：只列 `raw/` 根目录（不递归）下的文件。存在即待摄入，无需标记；收件箱为空则告知用户并结束。

3. **判断领域**：逐份判断归属领域（life / study / food / technology / stocks），简短列出计划；无匹配领域时先与用户确认，禁止擅自新建领域。

4. **三层编译**：读原文，写入 `lorebloom/<领域>/`。**wiki 是摄入后的成品和唯一日常内容载体，摄入后基本不再回看 raw**——因此页面必须完整承载原文中有价值的全部信息，严禁只写一句话摘要或只留关联链接：
   - `summaries/<主题>.md`：一对一**完整**结构化浓缩，保留原文的关键事实、数据、步骤、结论与来龙去脉；头部写：`> 源文件：[[raw/ingested/YYYY-MM/<文件名>|查看原文]]`
   - `concepts/<核心概念>.md`：完整的方法论、思维模型、认知，含要点、适用场景与案例。
   - `entities/<实体名>.md`：完整记录人物、工具、指标、标的、设备等对象的关键信息。
   - 验收标准：只读 wiki 页面即可掌握原文全部要点，无需再打开 raw；做不到即重写。
   - 关联已有页面时增量追加，不重复建页；主动建立跨领域 `[[双链]]`。
   - frontmatter：
     ```yaml
     ---
     type: concept | entity | summary
     title: <标题>
     description: <面向检索的简述>
     ---
     ```
   - 文件名沿用原文语言：中文概念用中文名，英文/技术专名保留英文。

5. **归档原文**：把处理完的文件从 `raw/` 移动到 `raw/ingested/YYYY-MM/`（资料日期无法判定时取当前月）。**内容一字不改，禁止删除**。移动即已摄入标记。

6. **更新目录与流水**：更新 `lorebloom/<领域>/index.md` 与 `lorebloom/index.md`；向 `lorebloom/log.md`（life 域同时向 `lorebloom/life/log.md`）追加 `## [YYYY-MM-DD] ingest | <主题>`。

7. **提交推送**：
   ```bash
   cd ~/onespace/github/lorebloom && git add -A && git commit -m "ingest: <主题>" && git push
   ```
