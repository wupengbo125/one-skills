#!/usr/bin/env bash
# 安装 post-commit 记忆提醒钩子到 one-skills 与 one-hippocampus
# 用法: bash hooks/install-hooks.sh   （幂等，可重复执行）
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOOK="$SCRIPT_DIR/post-commit"

for repo in "$HOME/onespace/github/one-skills" "$HOME/onespace/github/one-hippocampus"; do
  if [ -d "$repo/.git" ]; then
    cp -f "$HOOK" "$repo/.git/hooks/post-commit"
    chmod +x "$repo/.git/hooks/post-commit"
    mkdir -p "$repo/hooks"
    cp -f "$HOOK" "$repo/hooks/post-commit"
    echo "已安装: $repo/.git/hooks/post-commit"
  else
    echo "跳过(无 .git): $repo"
  fi
done
echo "完成"
