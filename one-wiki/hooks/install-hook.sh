#!/bin/bash
# install-hook.sh: 安装 one-wiki 的 post-commit 钩子到 one-llmwiki
# 只装钩子，不安装 skill 本体。

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GIT_DIR="$HOME/onespace/github/one-llmwiki/.git"
[ -d "$GIT_DIR" ] || { echo "❌ 找不到 one-llmwiki 仓库：$GIT_DIR"; exit 1; }

rm -f "$GIT_DIR/hooks/post-commit"
cp "$SCRIPT_DIR/post-commit" "$GIT_DIR/hooks/post-commit"
cp "$SCRIPT_DIR/../scripts/fts.py" "$GIT_DIR/hooks/fts.py"
chmod +x "$GIT_DIR/hooks/post-commit"
echo "✅ one-wiki post-commit 已安装到 one-llmwiki/.git/hooks/（旧钩子已清理）"
