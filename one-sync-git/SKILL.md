---
name: one-sync-git
description: 同步代码
disable-model-invocation: true
---

# Sync Git

同步流程：检查状态并拉取最新代码(pull)，有修改则生成 commit message 提交并推送(push)。

- **默认**：当前仓库
- **指定 all**：`$github_dir` 下所有仓库