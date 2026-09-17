---
name: one-ghfile
description: "GitHub 远端仓库文件操作：list/read/write/delete/edit/append，Agent 标准原语，底层走 gh api，不写本地文件。"
argument-hint: "list | read | write | delete | edit | append, 以及 repo/path/内容"
---

# One Ghfile (远端文件操作)

GitHub 远端仓库文件操作工具，Agent 标准原语。直接操作远端，不写本地文件、不做本地 git。

## 通道

- **豆包环境**：用 github-remote MCP（`get_file_contents` / `create_or_update_file` / `delete_file`），凭据平台托管，无需 token
- **其他环境（其他 AI / 其他电脑）**：用 ghfile.py 脚本（gh api，gh 已登录自动认证）

## 工具

| 命令 | 作用 |
| :--- | :--- |
| `list` | 列远端目录（同 `ls`） |
| `read` | 读远端文件（同 `cat`） |
| `write` | 写/覆盖远端文件 |
| `delete` | 删远端文件（同 `rm`） |
| `edit` | 局部替换/插入（old 唯一才成功） |
| `append` | 末尾追加一行 |

## 用法（ghfile.py）

```bash
python3 ~/onespace/github/one-skills/one-ghfile/scripts/ghfile.py <cmd> <repo> <path...>
```

| 命令 | 示例 |
| :--- | :--- |
| list | `ghfile.py list wupengbo125/one-skills one-memory` |
| read | `ghfile.py read wupengbo125/one-skills one-memory/SKILL.md` |
| write | `ghfile.py write <repo> <path> "<全文内容>" "<commit说明>"` |
| delete | `ghfile.py delete <repo> <path> "<commit说明>"` |
| edit | `ghfile.py edit <repo> <path> "<old文本>" "<new文本>"` |
| append | `ghfile.py append <repo> <path> "<新内容>"` |

兼容别名：`ls`=list，`cat`=read，`rm`=delete。默认分支 `main`，可用 `--branch b` 覆盖。

## 规则
- 写/改自动带 sha，无冲突覆盖；sha 冲突重试即可。
- `edit` 的 old 必须唯一，多匹配会拒绝（防改错）。
- 追加（append）→ 脚本内部先 read 再拼接到 write。
