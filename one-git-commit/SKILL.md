---
name: one-git-commit
description: 提交代码到git
disable-model-invocation: true
---

# Commit Git

有修改则生成 commit message 提交并推送(push)。最后，汇报哪些要提交？你都提交了什么, 提交信息是啥。 用表格。如果发现有新的commit，也可以顺便帮我拉一下

- **默认**：当前仓库
- **指定 all**：`$github_dir` 下所有仓库，先用命令检查有未提交的代码的仓库，然后再处理（生成commit并push）。