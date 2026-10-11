#!/usr/bin/env bash
# uninstall-hook.sh: 卸载 install-hook.sh 装下的钩子，可反复来回
#
# 用法：
#   bash uninstall-hook.sh            # 卸载所有 ~/onespace/github/* 仓库的钩子
#   bash uninstall-hook.sh --dry-run  # 只看要删什么，不动文件
#   bash uninstall-hook.sh <仓库名>... # 只卸指定仓库
#
# 认领依据（命中其一即认为是本仓装的）：
#   1. 清单 .one-hooks-manifest 里登记的文件
#   2. 文件带签名 # one-skills-hook（清单丢失时兜底）
#   3. 文件含本仓钩子独有的内容特征（清单和签名都还没有的老安装兜底）
# 三者都不命中的文件一律不动，别人放的钩子（如 Qoder 的 post-checkout）安全。

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SIGNATURE="# one-skills-hook"
FTS_MARKER="fts.py - 个人仓库 FTS5"
MANIFEST=".one-hooks-manifest"

DRY=0
TARGETS=()
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
    -*) echo "未知参数：$arg"; exit 1 ;;
    *) TARGETS+=("$arg") ;;
  esac
done

# 内容特征：取各钩子文件头注释里独有的字符串，命中即认为是本仓装的。
# 只认我们自己写的文案，不会误伤别人写的同名钩子。
is_ours() {
  local f="$1" hooks="$2" path="$hooks/$f"
  [ -f "$path" ] || return 1
  grep -q "^$SIGNATURE" "$path" && return 0
  case "$f" in
    pre-commit)  grep -qF '随身记忆原子提交' "$path" && return 0 ;;
    post-commit) grep -qF '提交自动同步索引' "$path" && return 0 ;;
    fts.py)      grep -qF "$FTS_MARKER" "$path" && return 0 ;;
  esac
  return 1
}

uninstall_repo() {
  local repo="$1" hooks="$1/.git/hooks" name="$2" f
  [ -d "$hooks" ] || return 0

  local files=()
  # 清单优先
  if [ -f "$hooks/$MANIFEST" ]; then
    while read -r f; do
      [ -n "$f" ] && [ -f "$hooks/$f" ] && files+=("$f")
    done < "$hooks/$MANIFEST"
  fi
  # 清单丢失/不全时按签名与内容特征兜底
  for f in pre-commit post-commit commit-msg fts.py; do
    printf '%s\n' "${files[@]-}" | grep -qx "$f" && continue
    is_ours "$f" "$hooks" && files+=("$f")
  done

  if [ ${#files[@]} -eq 0 ]; then
    # 清单存在但文件已不在，收尾清掉清单
    [ "$DRY" -eq 0 ] && rm -f "$hooks/$MANIFEST"
    return 0
  fi

  for f in "${files[@]}"; do
    if [ "$DRY" -eq 1 ]; then
      echo "[dry-run] 将删除: $name -> .git/hooks/$f"
    else
      rm -f "$hooks/$f"
      echo "已删除: $name -> .git/hooks/$f"
    fi
  done
  if [ "$DRY" -eq 0 ]; then
    rm -f "$hooks/$MANIFEST"
    echo "  已清理清单: $name"
  fi
}

if [ ${#TARGETS[@]} -gt 0 ]; then
  repos=()
  for name in "${TARGETS[@]}"; do
    repo="$HOME/onespace/github/$name"
    if [ ! -d "$repo" ]; then
      echo "❌ 找不到仓库：$name"
      exit 1
    fi
    repos+=("$repo")
  done
else
  repos=("$HOME/onespace/github"/*)
fi

for repo in "${repos[@]}"; do
  [ -d "$repo" ] || continue
  uninstall_repo "$repo" "$(basename "$repo")"
done

[ "$DRY" -eq 1 ] && echo "dry-run 结束，未修改任何文件" || echo "one-skills 钩子卸载完成"