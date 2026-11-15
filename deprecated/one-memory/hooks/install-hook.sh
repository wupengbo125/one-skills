#!/usr/bin/env bash
# install-hook.sh: 唯一安装源（与 uninstall-hook.sh 成对）
#   安装：bash one-skills/one-memory/hooks/install-hook.sh
#   卸载：bash one-skills/one-memory/hooks/uninstall-hook.sh
#
# 1. 向 ~/onespace/github/* 所有非记录型仓库安装 pre-commit（onememory 门禁）
# 2. 向记录型仓库安装 post-commit（自动同步 FTS 索引）+ fts.py
#
# 每次安装都写 .one-hooks-manifest 清单并在文件上打签名，供卸载脚本精确认领。
# 别人放在 .git/hooks/ 下的钩子（如 Qoder 的 post-checkout）一律不碰。

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SIGNATURE="# one-skills-hook"
FTS_MARKER="fts.py - 个人仓库 FTS5"
MANIFEST=".one-hooks-manifest"

# 记录型仓库：自身即记忆载体，不为「记录」再写一条记忆，不装 pre-commit 门禁
SKIP_REPOS="one-hippocampus one-life one-llmwiki"

# 在 hooks 目录写清单：只登记带本仓签名的钩子与本仓的 fts.py，反复装卸后清单始终自洽
write_manifest() {
  local hooks="$1" tmp="$1/.one-hooks-manifest.tmp" f
  : > "$tmp"
  for f in pre-commit post-commit commit-msg; do
    if [ -f "$hooks/$f" ] && grep -q "^$SIGNATURE" "$hooks/$f"; then
      echo "$f" >> "$tmp"
    fi
  done
  if [ -f "$hooks/fts.py" ] && grep -qF "$FTS_MARKER" "$hooks/fts.py"; then
    echo "fts.py" >> "$tmp"
  fi
  if [ -s "$tmp" ]; then mv "$tmp" "$hooks/$MANIFEST"; else rm -f "$tmp" "$hooks/$MANIFEST"; fi
}

# 复制一个钩子并打上签名，供卸载识别
install_hook() {
  cp "$1" "$2" || return 1
  chmod +x "$2" || return 1
  grep -q "^$SIGNATURE" "$2" || printf '\n%s\n' "$SIGNATURE" >> "$2"
}

# 给记录型仓库装 post-commit + fts.py；源目录不存在时跳过并告警，不报错
install_index_hook() {
  local name="$1" post_src="$2" fts_src="$3"
  local hooks="$HOME/onespace/github/$name/.git/hooks"
  [ -d "$hooks" ] || { echo "⚠️ 未找到 $name 仓库，跳过 post-commit 安装"; return 0; }
  [ -f "$post_src" ] || { echo "⚠️ 源文件不存在：$post_src，跳过 $name"; return 0; }
  install_hook "$post_src" "$hooks/post-commit" || return 1
  cp "$fts_src" "$hooks/fts.py" || return 1
  write_manifest "$hooks"
  echo "已安装 post-commit + fts.py: $name"
}

# 1. 批量安装 pre-commit 门禁到所有非记录型仓库
for repo in "$HOME/onespace/github"/*; do
  if [ -d "$repo/.git/hooks" ]; then
    name=$(basename "$repo")
    case " $SKIP_REPOS " in
      *" $name "*)
        # 记录型仓库不装门禁；若之前装过则清掉并同步清单
        rm -f "$repo/.git/hooks/pre-commit"
        write_manifest "$repo/.git/hooks"
        echo "已跳过记录型仓库: $name"
        continue
        ;;
    esac
    install_hook "$SCRIPT_DIR/pre-commit" "$repo/.git/hooks/pre-commit" || exit 1
    write_manifest "$repo/.git/hooks"
    echo "已安装 pre-commit: $name"
  fi
done

# 2. 记录型仓库专属：post-commit 索引同步
install_index_hook one-hippocampus "$SCRIPT_DIR/post-commit"       "$SKILLS_DIR/one-memory/scripts/fts.py"
install_index_hook one-llmwiki     "$SKILLS_DIR/one-wiki/hooks/post-commit" "$SKILLS_DIR/one-wiki/scripts/fts.py"
install_index_hook one-life        "$SKILLS_DIR/one-life/hooks/post-commit" "$SKILLS_DIR/one-life/scripts/fts.py"

echo "one-skills 钩子安装完成"