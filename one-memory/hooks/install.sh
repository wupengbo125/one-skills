#!/bin/bash
# 安装 commit-msg hook 到当前仓库
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GIT_DIR="$(git rev-parse --git-dir)" || { echo "❌ 不是 git 仓库"; exit 1; }
cp "$SCRIPT_DIR/commit-msg" "$GIT_DIR/hooks/commit-msg" || exit 1
chmod +x "$GIT_DIR/hooks/commit-msg" || exit 1
echo "✅ commit-msg hook 已安装到 $(basename $(git rev-parse --show-toplevel))"
