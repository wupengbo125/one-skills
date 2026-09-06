#!/usr/bin/env bash
# One Super-Me: 目标 Agent 钩子卸载器 (Uninstall Hook)
# 职责：
# 1. 干净注销目标 Agent (Claude Code 或 OMP) 中挂载的 Super-Me 钩子
# 2. 移除技能软链接
# 3. 完整保留海马体数据与本地配置
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_AGENT=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --agent|-a)
            TARGET_AGENT="$2"
            shift 2
            ;;
        --help|-h)
            echo "One Super-Me: Agent 钩子卸载器"
            echo ""
            echo "用法:"
            echo "  ./uninstall-hook.sh --agent claude   # 从 Claude Code 注销钩子"
            echo "  ./uninstall-hook.sh --agent omp      # 从 OMP 注销钩子"
            echo "  ./uninstall-hook.sh --agent all      # 清理所有 Agent 钩子"
            exit 0
            ;;
        *)
            shift
            ;;
    esac
done

echo "=================================================================="
echo "      One Super-Me (超级我) Agent 钩子卸载器"
echo "=================================================================="

if [ -z "$TARGET_AGENT" ]; then
    echo "请选择要从哪一个 Agent 卸载 Super-Me 钩子:"
    echo "  [1] Claude Code"
    echo "  [2] OMP / Pi"
    echo "  [3] 全部清理 (all)"
    read -r -p "请输入选项 [1, 2 或 3]: " choice
    case "$choice" in
        2|omp|OMP) TARGET_AGENT="omp" ;;
        3|all|ALL) TARGET_AGENT="all" ;;
        *) TARGET_AGENT="claude" ;;
    esac
fi

UNINSTALLED_ITEMS=()

# 1. 清理 Claude Code
if [ "$TARGET_AGENT" = "claude" ] || [ "$TARGET_AGENT" = "all" ]; then
    CLAUDE_SETTINGS="$HOME/.claude/settings.json"
    if [ -f "$CLAUDE_SETTINGS" ]; then
        python3 - <<PY
import json
import os

path = os.path.expanduser("$CLAUDE_SETTINGS")
try:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
except Exception:
    data = {}

if "hooks" in data and "Stop" in data["hooks"]:
    new_stops = []
    for item in data["hooks"]["Stop"]:
        keep = True
        for h in item.get("hooks", []):
            if "one-super-me" in h.get("command", "") or "hook.sh" in h.get("command", ""):
                keep = False
                break
        if keep:
            new_stops.append(item)
    data["hooks"]["Stop"] = new_stops
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
PY
        UNINSTALLED_ITEMS+=("Claude Code: ~/.claude/settings.json (Stop 钩子已注销)")
    fi
    [ -L "$HOME/.claude/skills/one-super-me" ] && rm -f "$HOME/.claude/skills/one-super-me"
fi

# 2. 清理 OMP
if [ "$TARGET_AGENT" = "omp" ] || [ "$TARGET_AGENT" = "all" ]; then
    OMP_HOOK="$HOME/.omp/agent/extensions/one-super-me-hook.ts"
    if [ -f "$OMP_HOOK" ]; then
        rm -f "$OMP_HOOK"
        UNINSTALLED_ITEMS+=("OMP / Pi: $OMP_HOOK (扩展已删除)")
    fi
    [ -L "$HOME/.agents/skills/one-super-me" ] && rm -f "$HOME/.agents/skills/one-super-me"
fi

echo ""
echo "=================================================================="
echo "✅ Super-Me 钩子已成功注销！"
echo "=================================================================="
for item in "${UNINSTALLED_ITEMS[@]}"; do
    echo "  - $item"
done
echo "------------------------------------------------------------------"
echo "ℹ️ 提示: 您的海马体知识库与 ~/.config/one-super-me/ 配置已被完整保留。"
echo "=================================================================="
