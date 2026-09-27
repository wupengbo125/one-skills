# 校验 (lint)

检查并修复知识层 `lorebloom/` 的质量问题。`raw/` 不参与 lint。本地通道：读写 `~/onespace/github/lorebloom`，完成后 commit + push。

## 步骤

1. `git pull`。
2. 扫描巡检：
   - 死链与失效双链（含指向 `raw/<领域>/` 的原文链接）；
   - 内容过薄页面：正文有效信息过少、只读 wiki 无法掌握原文要点的 summary/concept/entity，列出并建议重新摄入；
   - 无入链的孤立页面；
   - 观点矛盾或陈旧失效的断言；
   - 多次提及但未独立建页的概念缺口；
   - 类型错位：我的项目放在 entities、修行方法放在 entities 等。
3. 列出问题与修复建议，征求用户确认后再改。
4. 精准修复；更新相关领域 index 与 `lorebloom/index.md`；向 `lorebloom/log.md` 追加 `## [YYYY-MM-DD] lint | <简要说明>`。
5. `git add -A && git commit -m "lint: <简要说明>" && git push`。

## 完成标准

- 列出的每一项问题都有处理结果（修复 / 标记待补充 / 经用户确认保留）。
- `git push` 成功。
