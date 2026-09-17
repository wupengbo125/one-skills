---
name: one-ghfile
description: "GitHub 远端仓库文件操作：list/read/write/delete/edit/append，Agent 标准原语，底层走 gh api，不写本地文件。"
argument-hint: "list | read | write | delete | edit | append, 以及 repo/path/内容"
---

# One Ghfile (远端文件操作)

GitHub 远端仓库文件操作，Agent 标准原语：`list` / `read` / `write` / `delete` / `edit` / `append`。直接操作远端，不写本地文件、不做本地 git。

## 通道

- **豆包环境**：不走本 skill 的命令。直接用 github-remote MCP：`get_file_contents`（读/列目录）、`create_or_update_file`（写/改，带 sha + branch=main）、`delete_file`（删）。凭据平台托管，与 ghfile.py 无关。
- **其他环境（其他 AI / 其他电脑）**：用 ghfile.py 脚本（gh api，gh 已登录自动认证）。这是本 skill 命令的唯一使用场景。

## 工具

| 命令 | 作用 |
| :--- | :--- |
| `list` | 列远端目录 |
| `read` | 读远端文件 |
| `write` | 写/覆盖远端文件 |
| `delete` | 删远端文件 |
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

默认分支 `main`，可用 `--branch b` 覆盖。

## 规则
- 写/改自动带 sha，无冲突覆盖；sha 冲突重试即可。
- `edit` 的 old 必须唯一，多匹配会拒绝（防改错）。
- 追加（append）→ 脚本内部先 read 再拼接到 write。
- gh 未登录：先 `gh auth login`。
- 文件不存在：`read` / `edit` / `append` 报错；`write` 自动新建。
