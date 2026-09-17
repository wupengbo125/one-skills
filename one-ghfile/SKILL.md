---
name: one-ghfile
description: "GitHub 远端仓库文件操作：ls/cat/write/rm/edit/append，底层走 gh api，不写本地文件。"
argument-hint: "ls | cat | write | rm | edit | append, 以及 repo/path/内容"
---

# One Ghfile (远端文件操作)

GitHub 远端仓库文件操作工具，4 个 Agent 基础原语 + edit。底层 `gh api`（gh 已登录，自动认证），直接操作远端，不写本地文件、不做本地 git。

## 工具

| 命令 | 作用 |
| :--- | :--- |
| `ls` | 列远端目录（同 `ls`） |
| `cat` | 读远端文件（同 `cat`） |
| `write` | 写/覆盖远端文件（同 `write`） |
| `rm` | 删远端文件（同 `rm`） |
| `edit` | 局部替换/插入（old 唯一才成功） |
| `append` | 末尾追加一行 |

## 用法

```bash
python3 ~/onespace/github/one-skills/one-ghfile/scripts/ghfile.py <cmd> <repo> <path...>
```

| 命令 | 示例 |
| :--- | :--- |
| ls | `ghfile.py ls wupengbo125/one-skills one-memory` |
| cat | `ghfile.py cat wupengbo125/one-skills one-memory/SKILL.md` |
| write | `ghfile.py write <repo> <path> "<全文内容>" "<commit说明>"` |
| rm | `ghfile.py rm <repo> <path> "<commit说明>"` |
| edit | `ghfile.py edit <repo> <path> "<old文本>" "<new文本>"` |
| append | `ghfile.py append <repo> <path> "<新内容>"` |

默认分支 `main`，可用 `--branch b` 覆盖。

## 规则
- 写/改自动带 sha，无冲突覆盖；sha 冲突重试即可。
- `edit` 的 old 必须唯一，多匹配会拒绝（防改错）。
- 追加（append）→ 脚本内部先 cat 再拼接到 write。
