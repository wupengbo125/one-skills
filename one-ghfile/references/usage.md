# ghfile 详细说明

## 通道

| 环境 | 通道 | 说明 |
| :--- | :--- | :--- |
| 豆包环境 | **github-remote MCP** | `get_file_contents`（读/列目录）、`create_or_update_file`（写/改，带 sha + branch=main）、`delete_file`（删）。凭据平台托管，无需 token |
| 其他 AI / 其他电脑 | **ghfile.py 脚本（gh api）** | gh 已登录自动认证，无需 token |

两通道效果完全等价：写入即自动 commit+push 远端 main 分支。

## 脚本路径

```bash
python3 ~/onespace/github/one-skills/one-ghfile/scripts/ghfile.py
```

建议装个别名：`alias ghfile='python3 ~/onespace/github/one-skills/one-ghfile/scripts/ghfile.py'`

## 子命令全参

| 命令 | 参数 | 说明 |
| :--- | :--- | :--- |
| `list` | `<repo> [path] [--branch]` | 列目录，显示 📁/📄 |
| `read` | `<repo> <path> [--branch]` | 读文件全文 |
| `write` | `<repo> <path> <content> [msg] [--branch]` | 新建/覆盖；自动取 sha，不存在则新建 |
| `delete` | `<repo> <path> [msg] [--branch]` | 删除，自动带 sha |
| `edit` | `<repo> <path> <old> <new> [msg] [--branch]` | 精确文本替换；old 0 匹配或 >1 匹配均拒绝 |
| `append` | `<repo> <path> <content> [msg] [--branch]` | 末尾追加一行 |

默认分支 `main`，`--branch` 可覆盖。

## 4 个基础原语映射

Agent 框架的四个基础文件操作与 ghfile 一一对应：

| Agent 原语 | ghfile 命令 |
| :--- | :--- |
| List | `list` |
| Read | `read` |
| Write | `write` |
| Delete | `delete` |

`edit` / `append` 是增强操作，底层仍是 read+write 组合（读全文 → 内存改 → 整块覆盖写回）。

## 关键行为

- **write 冲突保护**：PUT 前先 GET 取 sha 带上；若远端已被他人改过（sha 不匹配），GitHub 会拒绝，重试即可（重新 get sha 再 PUT）。
- **edit 防错**：old 文本必须唯一。找不到或多处匹配都不改文件，避免 AI 改错位置。
- **append**：先 read 拿到全文，`rstrip` 去尾空行后拼接新行，再整块 write 回去。
- **大文件限制**：GitHub contents API 上限 100MB，笔记/skill/代码文件完全够用。

## 错误处理

- gh 未登录：脚本直接报 gh 的错误，先 `gh auth login`。
- 文件不存在：read/edit/append 会报错；write 会新建。
- sha 冲突：GitHub 返回 409，重新执行一次即可（脚本每次都会重新取 sha）。
