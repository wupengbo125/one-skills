# 摄入 (ingest)

扫描收件箱 `raw/` 根目录，把原始资料编译入知识层 `lorebloom/<领域>/`，随后原文按月归档。
**本地通道**：读写 `~/onespace/github/lorebloom`，完成后 commit + push。

## 步骤

1. **拉取最新**：`cd ~/onespace/github/lorebloom && git pull`

2. **扫描收件箱**：只列 `raw/` 根目录（不递归）下的文件。存在即待摄入，无需标记；收件箱为空则告知用户并结束。

3. **判断领域**：逐份判断归属领域（life / mindset / technology / stocks / personal / food / english），简短列出计划；无匹配领域时先与用户确认，禁止擅自新建领域。

4. **三层编译**：读原文，写入 `lorebloom/<领域>/`：
   - `summaries/<主题>.md`：一对一结构化浓缩，头部写：`> 源文件：[[raw/ingested/YYYY-MM/<文件名>|查看原文]]`
   - `concepts/<核心概念>.md`：方法论、思维模型、认知。
   - `entities/<实体名>.md`：人物、工具、指标、标的、设备等。
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

6. **更新目录与流水**：更新 `lorebloom/<领域>/index.md` 与 `lorebloom/index.md`；向 `lorebloom/log.md`（life 域同时向 `lorebloom/life/log.md`）追加 `## [YYYY-MM-DD] ingest | <主题>`；必要时更新 `onememory/timeline.md`。

7. **提交推送**：
   ```bash
   cd ~/onespace/github/lorebloom && git add -A && git commit -m "ingest: <主题>" && git push
   ```
