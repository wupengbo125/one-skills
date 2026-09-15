# 写日记 SOP

## 步骤

1. **定日期**：用户说"今天"→ 今天；"昨天"→ 前一天；提到具体日期就用那个日期。
2. **定文件**：`~/onespace/github/one-life/diary/<YYYY>/<YYYY-MM-DD.md`（年目录不存在就建）。
3. **追加内容**：
   - 文件不存在 → 首行 `# YYYY-MM-DD 周X`，再追加 `## HH:MM`
   - 文件已存在 → 直接追加 `## HH:MM`（同一时刻续写就接在上一段后面）
   - **正文原话直录，用户怎么说的就怎么记，不润色、不归纳、不加强制格式/标签**（唯一例外：用户明确要求整理时才结构化）
4. **顺手更新 entities**（只在出现新名字/新地点时）：
   - `entities/people.md` → `- 名字 — YYYY-MM-DD`
   - `entities/places.md` → `- 地点 — YYYY-MM-DD`
   - 已存在则把日期改成最新
5. **提交推送**：
   ```bash
   cd ~/onespace/github/one-life && git add -A \
     && git commit -m "life: <YYYY-MM-DD> 日记" && git push
   ```
   （post-commit 自动增量同步索引，不需要手动 rebuild）
6. **反馈**：一句话，告诉用户记到哪天了。不要复述内容。

## 注意

- 不主动同步到海马体今日流水——那是 AI 干活流水，生活记录写进去是噪音；用户明说"顺便记一下"才加一行。
- 一天多篇就多个 `## HH:MM` 小节，不要覆盖已有内容。
