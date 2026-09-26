# 摄入 (ingest)

扫描收件箱 `raw/` 根目录，把原文编译成知识层成品，原文移进对应领域目录。本地通道：读写 `~/onespace/github/lorebloom`，完成后 commit + push。

## 步骤

1. `git pull`。
2. 只列 `raw/` 根目录（不递归）下的文件；根目录为空则告知用户并结束。
3. 逐份判断领域（life / study / food / technology / stocks），向用户简短列出计划；新领域先与用户确认。
4. 读原文，先识别**核心**：这篇原文要传达的那个道理、方法或对象信息。所有抽取围绕核心；用来引出核心的场景与道具是**媒介**（如借乒乓球讲人生道理，乒乓球即媒介）。写入 `lorebloom/<领域>/`：
   - **summaries**：完整承载核心，保留要点、数据、步骤、结论；媒介在叙述中自然提及；去掉网页导航/广告/重复；头部写 `> 源文件：[[raw/<领域>/<文件名>|查看原文]]`。
   - **concepts**：核心中的可复用方法论、跨多篇资料出现的思维模型；单次观点留在 summary 里。
   - **entities**：核心中的外部对象（人物、工具、产品、地点、食材），页面承载该对象本身的独立信息；仅作为场景出现的对象保持文字提及。
   - **projects**：我的项目，记录状态、进展、待办；核心涉及其他领域已有的项目或页面时，用 `[[双链]]` 指过去。
   - frontmatter：`type`、`title`、`description`。
5. 原文从 `raw/` 根目录移动到 `raw/<领域>/`，内容保持原样。
6. 更新 `lorebloom/<领域>/index.md` 与 `lorebloom/index.md`；向 `lorebloom/log.md` 追加 `## [YYYY-MM-DD] ingest | <主题>`。
7. `git add -A && git commit -m "ingest: <主题>" && git push`。

## 完成标准

- 每个新建/更新的 summary 只读页面即可掌握原文要点，无需再打开 raw。
- 逐个核对新建页面：每页都承载核心信息，媒介类对象只在 summary 文字里出现。
- 根目录 `raw/` 已清空（所有文件移进领域目录）。
- `git push` 成功。
