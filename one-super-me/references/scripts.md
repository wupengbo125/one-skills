# 辅助脚本与近期记忆治理说明 (Scripts Reference)

> 脚本路径：`one-super-me/scripts/super_me.py`（系统全局别名：`super-me`）

---

## 1. 脚本命令详解

| 子命令 | 参数 | 说明 | 调用示例 |
| :--- | :--- | :--- | :--- |
| `search` | `<关键词>` | **BM25 本地检索**：毫秒级检索海马体文档，输出高亮片段与相关度评分，零 Token 消耗。 | `python3 scripts/super_me.py search "Tailscale 代理"` |
| `<关键词>` | `<关键词>` | **快捷检索**：省略 `search` 关键字直接检索。 | `python3 scripts/super_me.py "FRP 穿透"` |
| `recent` | `<实体> [指针]` | **近期活跃流水打卡与置顶**：将访问时间更新为今天并移至表格首行。自动执行 60 天/100 条双阈值淘汰与索引同步。别名：`touch`。 | `python3 scripts/super_me.py recent "用户画像" "system/profile.md"` |
| `clean` | 无 | **近期记忆治理**：按 60 天超期与 100 条上限淘汰旧条目，并自动同步 `recent.md` 索引。 | `python3 scripts/super_me.py clean` |
| `sync` | `<相对路径>` | **增量索引同步**：将单篇 Markdown 文件即时写入 `.fts.db` 索引库；文件不存在时自动清理对应索引条目。 | `python3 scripts/super_me.py sync "recent.md"` |
| `rebuild` | 无 | **全量重建索引**：全量扫描海马体目录中的所有 `.md` 文件并重建 `.fts.db`。 | `python3 scripts/super_me.py rebuild` |

---

## 2. 近期记忆 (`recent.md`) 规范

* **条目格式**：`| 实体 / 主题 | 对应文档指针 / 内容简述 | 最近访问时间 |`（格式：`YYYY-MM-DD`）
* **访问置顶**：条目被访问或更新后，时间戳刷新为当天并移到表格首行。
* **双阈值清理**：
  * 时间上限：保留 60 天内的条目，超期自动清理；
  * 数量上限：最多保留 100 条，超出按访问时间倒序截断；
  * 执行方式：调用 `python3 scripts/super_me.py recent` 自动触发。
