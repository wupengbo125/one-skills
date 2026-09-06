# 辅助脚本说明

脚本路径：`one-free-me/scripts/free_me.py`

| 子命令 | 说明 | 调用示例 |
| :--- | :--- | :--- |
| `search <关键词>` | **本地检索**：检索海马体文档与高亮片段。 | `python3 scripts/free_me.py search "Tailscale"` |
| `sync <文件路径>` | **增量同步**：将指定文件写入索引库。 | `python3 scripts/free_me.py sync "history.md"` |
| `rebuild` | **全量重建**：全量重建 `.fts.db` 索引。 | `python3 scripts/free_me.py rebuild` |
