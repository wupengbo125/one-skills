---
name: one-push
description: 同步代码
disable-model-invocation: true
---

# Sync Git

同步流程：检查状态并拉取最新代码(pull)，有修改则生成 commit message 提交并推送(push)。

- **默认**：当前仓库
- **指定 all**：`$github_dir` 下所有仓库，先用命令检查有未提交的代码的仓库，然后再处理（生成commit并push）。最后，汇报哪些要提交？你都提交了什么, 提交信息是啥。 用表格。