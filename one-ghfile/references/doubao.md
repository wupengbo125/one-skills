# 豆包环境特例（仅豆包）

豆包不走本 skill 的 ghfile.py 命令，直接用 github-remote MCP，凭据平台托管。

| 命令 | 豆包 MCP 工具 |
| :--- | :--- |
| `list` | `get_file_contents` |
| `read` | `get_file_contents` |
| `write` | `create_or_update_file`（带 sha + branch=main） |
| `delete` | `delete_file` |
| `edit` | `read` + `create_or_update_file` 组合 |
| `append` | `read` + `create_or_update_file` 组合 |
