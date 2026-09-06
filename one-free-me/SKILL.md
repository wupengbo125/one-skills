---
name: one-free-me
description: "产生实质代码或配置修改（自动伴随记忆），或用户输入“收工”、“超级我”时触发。"
---

# One Free-Me (超级我)

海马体记忆中枢与执行代理。数据仓位于 `$github_dir/one-hippocampus/`，辅助脚本位于 `scripts/free_me.py`。

## 意图分流与参考指南

- **查资料 / 搜记忆**：
  - 检索命令：`python3 scripts/free_me.py search "<关键词>"`
  - 寻路规则见 [references/routing.md](references/routing.md)
- **日常编码（自动伴随记忆）**：
  - 产生实质改动时增量记录，规则见 [references/auto-memory.md](references/auto-memory.md)
- **会话收工（用户输入“收工”、“超级我”）**：
  - 会话复盘与近期流水打卡，规则见 [references/manual-memory.md](references/manual-memory.md)
- **脚本与近期记忆生命周期**：
  - 脚本子命令与 `recent.md` 治理规则见 [references/scripts.md](references/scripts.md)
