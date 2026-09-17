#!/usr/bin/env bash
# install-hook.sh:
# 1. 向 ~/onespace/github/* 所有 Git 仓库安装 pre-commit（onememory 门禁）
# 2. 向 one-hippocampus 专属安装 post-commit（自动同步 FTS 索引）

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PRE_COMMIT="$SCRIPT_DIR/pre-commit"
POST_COMMIT="$SCRIPT_DIR/post-commit"

# 1. 批量安装 pre-commit 门禁到所有 GitHub 仓库
for repo in "$HOME/onespace/github"/*; do
  if [ -d "$repo/.git/hooks" ]; then
    cp "$PRE_COMMIT" "$repo/.git/hooks/pre-commit" || exit 1
    chmod +x "$repo/.git/hooks/pre-commit" || exit 1
    echo "已安装 pre-commit: $(basename "$repo")"
  fi
done

# 2. 专属安装 post-commit 索引同步到 one-hippocampus
HIPPO_DIR="$HOME/onespace/github/one-hippocampus/.git"
if [ -d "$HIPPO_DIR/hooks" ]; then
  cp "$POST_COMMIT" "$HIPPO_DIR/hooks/post-commit" || exit 1
  chmod +x "$HIPPO_DIR/hooks/post-commit" || exit 1
  echo "已安装 post-commit: one-hippocampus"
else
  echo "⚠️ 未找到 one-hippocampus 仓库，跳过 post-commit 安装"
fi

echo "one-memory 钩子安装完成"
