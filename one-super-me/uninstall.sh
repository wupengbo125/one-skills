#!/usr/bin/env bash
# One Super-Me: 卸载器 (Uninstaller)
# 职责：
# 1. 从宿主环境 (Claude Code 等) 移除注册的 Stop 后壳
# 2. 移除全局技能软链接
# 3. 保持海马体数据仓与本地配置文件完好
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=================================================="
echo "    One Super-Me (超级我) 卸载器 (Uninstaller)"
echo "=================================================="

# 1. 移除 Claude Code Stop 钩子
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
if [ -f "$CLAUDE_SETTINGS" ]; then
    echo "🔍 正在从 Claude Code 移除 Super-Me Stop 后壳..."
    python3 - <<PY
import json
import os

settings_path = os.path.expanduser("$CLAUDE_SETTINGS")

try:
    with open(settings_path, "r", encoding="utf-8") as f:
        data = json.load(f)
except Exception as e:
    print("   [!] 读取 settings.json 失败:", e)
    exit(0)

if "hooks" in data and "Stop" in data["hooks"]:
    orig_len = len(data["hooks"]["Stop"])
    new_stop = []
    for item in data["hooks"]["Stop"]:
        keep = True
        for h in item.get("hooks", []):
            if "one-super-me" in h.get("command", ""):
                keep = False
                break
        if keep:
            new_stop.append(item)
    data["hooks"]["Stop"] = new_stop
    if len(new_stop) < orig_len:
        with open(settings_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print("   ✅ 已成功注销 Claude Code Stop 事件中的 Super-Me 后壳")
    else:
        print("   ℹ️ Claude Code 中未找到 Super-Me 后壳，无需清理")
PY
fi

# 2. 移除全局技能软链接
for target_skills_dir in "$HOME/.claude/skills" "$HOME/.agents/skills"; do
    link_path="$target_skills_dir/one-super-me"
    if [ -L "$link_path" ]; then
        rm -f "$link_path"
        echo "🗑️ 已移除全局技能软链接: $link_path"
    fi
done

echo "=================================================="
echo "✅ One Super-Me 后壳与全局技能注册已清理干净！"
echo "ℹ️ 注意：海马体数据仓与 ~/.config/one-super-me/ 配置文件仍完整保留。"
echo "=================================================="
