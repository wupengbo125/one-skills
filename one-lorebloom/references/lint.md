# 校验 (lint)

检查并修复知识层 `lorebloom/` 的质量问题。`raw/` 不参与 lint。
**本地通道**：读写 `~/onespace/github/lorebloom`，完成后 commit + push。

## 步骤

1. **拉取最新**：`cd ~/onespace/github/lorebloom && git pull`

2. **扫描巡检**：
   - 死链与失效双链（含指向 `raw/ingested/` 的原文链接）；
   - 无入链的孤立页面；
   - 观点矛盾或陈旧失效的断言；
   - 多次提及但未独立建页的概念缺口；
   - 知识盲区（提示可补充哪方面源材料）。

3. **拟定方案**：列出问题与修复建议，征求用户确认后再改。

4. **修复与流水**：精准修复；向 `lorebloom/log.md` 追加 `## [YYYY-MM-DD] lint | <简要说明>`。

5. **提交推送**：
   ```bash
   cd ~/onespace/github/lorebloom && git add -A && git commit -m "lint: <简要说明>" && git push
   ```
