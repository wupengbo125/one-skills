#!/bin/bash
# 安装 pre-commit hook 到当前仓库，并清理旧版 commit-msg 钩子
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GIT_DIR="$(git rev-parse --git-dir)" || { echo "❌ 不是 git 仓库"; exit 1; }
cp "$SCRIPT_DIR/pre-commit" "$GIT_DIR/hooks/pre-commit" || exit 1
chmod +x "$GIT_DIR/hooks/pre-commit" || exit 1
if [ -f "$GIT_DIR/hooks/commit-msg" ]; then
  rm -f "$GIT_DIR/hooks/commit-msg"
fi
echo "✅ pre-commit hook (onememory 门禁) 已安装，旧版 commit-msg 已清理"
