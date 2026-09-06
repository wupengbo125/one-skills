---
name: one-super-me
description: "产生实质改动（自动记忆），或用户输入“收工”、“超级我”、“记一下”、“避坑手册”时触发。"
---

# One Super-Me (超级我)

海马体记忆中枢与执行代理。数据仓位于 `$github_dir/one-hippocampus/`，辅助脚本位于 `scripts/super_me.py`。

## 意图分流与参考指南

按用户意图查阅对应指南，按需加载：

- **查资料 / 搜记忆**：
  - 优先执行检索：`python3 scripts/super_me.py search "<关键词>"`
  - 寻路规则见 [references/routing.md](references/routing.md)
- **日常编码（自动伴随记忆）**：
  - 产生实质改动时增量记录，规则见 [references/auto-memory.md](references/auto-memory.md)
- **会话收工（用户输入“收工”、“超级我”）**：
  - 会话复盘与近期流水打卡，规则见 [references/manual-memory.md](references/manual-memory.md)
- **避坑手册（用户输入“记一下”、“避坑手册”）**：
  - 沉淀实操规程至 `onewiki/`，规则见 [references/wiki.md](references/wiki.md)
- **脚本与近期记忆生命周期**：
  - 脚本子命令与 `recent.md` 治理规则见 [references/scripts.md](references/scripts.md)
