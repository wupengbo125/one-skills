# 摄入与编译 (ingest)

将 `raw/` 中的生活原始源材料提炼编译入 `onelife/` 持久生活知识库。
**本操作走本地通道**：直接读写本地仓库 `~/onespace/github/one-life`，完成后 git commit push。

## 执行步骤

1. **拉取最新**：
   ```bash
   cd ~/onespace/github/one-life && git pull
   ```

2. **扫描与计划**：
   - 列本地 `raw/` 根目录下的源文件，按文件名日期确定归档季节目录 `<YYYY>-<season>`：3-5月→`spring`，6-8月→`summer`，9-11月→`autumn`，12月→当年 `winter`，1-2月→上一年 `winter`（如 `2026-09-15-xxx.md` → `2026-autumn`；`2027-01-03-xxx.md` → `2026-winter`）。
   - 特殊位置扫描 `raw/misc/` 下文件，不移动，不分类，直接做其余动作。
   - 其他位置（已归档到季节目录的）是已经 ingest 的，禁止再次扫描。
   - 简短向用户列出拟新建/更新的页面计划。

3. **移动与三层编译**：
   - 读原文 -> 移动到 `raw/<YYYY>-<season>/` 季节目录 -> 删除原位置（均为本地文件操作）。
   - **严禁自作主张翻译文件名**：原文是什么语言就用什么语言（中文概念/人物/地点直接用纯中文名，如 `五台山.md`、`早起站桩.md`；专有名词保留原文）。严禁机械转成英文 kebab-case。
   - **强制三层萃取**：
     - `summaries/<主题>.md`：一对一结构化浓缩生活事件或日常记录，头部链向原文：`> 源文件：[[../../raw/<YYYY>-<season>/<filename>.md|查看原文]]`
     - `concepts/<核心概念>.md`：提炼生活方式、习惯模式、体验感悟与生活心法。
     - `entities/<实体名>.md`：提炼具体人物（朋友、家人、同行者）、地点（常去处、旅游地）、物品设备或宠物。
   - **跨域双链穿透**：严禁受物理目录限制。提炼概念与实体时主动穿透挖掘底层关联（如在旅行中链接人物与心境，在美食中链接地点与同伴），自由跨目录建立 `[[概念]]` 双链。
   - **增量更新既有页面**：若新材料关联已有概念或实体，在其对应页面追加新事件、足迹、观点更新或关系演进。
   - 页面附带极简 Frontmatter：
   ```yaml
   ---
   type: concept | entity | summary
   title: <标题>
   description: <面向检索的简述>
   ---
   ```

4. **维护大纲与流水**：
   - 更新分类大纲 `onelife/<topic>/index.md` 与总索引 `onelife/index.md`（本地文件操作）。
   - `onelife/log.md` 追加：`## [YYYY-MM-DD] ingest | <主题>` 记录。

5. **提交推送并汇报**：
   ```bash
   cd ~/onespace/github/one-life && git add -A && git commit -m "ingest: <主题>" && git push
   ```
   操作完汇报已推送到远端。
   如需更新本地检索索引，再执行 `python3 scripts/fts.py sync "<相对路径>"`
