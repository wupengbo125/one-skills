#!/bin/bash
# 安装 commit-msg hook 到当前仓库
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp "$SCRIPT_DIR/commit-msg" .git/hooks/commit-msg
chmod +x .git/hooks/commit-msg
echo "✅ commit-msg hook 已安装到 $(basename $(git rev-parse --show-toplevel))"
