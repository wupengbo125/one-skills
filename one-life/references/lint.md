# 生活 Wiki 质量巡检 (lint)

健康检查并修复 `onelife/` 的质量问题。
**本操作走本地通道**：直接读写本地仓库 `~/onespace/github/one-life`，完成后 git commit push。

## 执行步骤

1. **拉取最新**：
   ```bash
   cd ~/onespace/github/one-life && git pull
   ```

2. **扫描巡检**：
   - 死链与失效双链；
   - 无任何入链引用的孤立页面；
   - 事实矛盾与时间冲突（如同一事件/人物/地点的日期、地点或事实前后矛盾）；
   - 正文中被多次提及但尚未独立建页的核心实体（人物、地点、重要资产缺口）；
   - 记录盲区（提示用户可补充哪些生活维度的源材料）。

3. **拟定方案**：向用户列出已确认的质量问题及修复建议，征求确认。

4. **修复与流水**：
   - 确认后精准执行修复（本地文件操作）。
   - `onelife/log.md` 追加：`## [YYYY-MM-DD] lint | <简要说明>`

5. **提交推送并汇报**：
   ```bash
   cd ~/onespace/github/one-life && git add -A && git commit -m "lint: <简要说明>" && git push
   ```
   操作完汇报已推送到远端。
   如需更新本地检索索引，再执行 `python3 scripts/fts.py sync "<改动文件相对路径>"`
