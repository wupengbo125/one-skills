#!/usr/bin/env bash
HOOK="$(cd "$(dirname "$0")" && pwd)/post-commit"

for repo in ~/onespace/github/*; do
  if [ -d "$repo/.git" ]; then
    cp -f "$HOOK" "$repo/.git/hooks/post-commit"
    chmod +x "$repo/.git/hooks/post-commit"
    echo "已安装: $repo/.git/hooks/post-commit"
  fi
done
echo "完成"
