#!/usr/bin/env bash
# One Super-Me: 通用安装器 (Installer)
# 职责：
# 1. 检查 Python 3 与 SQLite 环境
# 2. 初始化用户独立配置文件 (~/.config/one-super-me/config.env)，绝不硬编码任何私有账号
# 3. 自动检测宿主环境 (Claude Code / OMP / Pi) 并挂接标准 Stop 后壳
# 4. 软链接 Skill 到全局 Agent 技能库
# 5. 初始化/同步本地 BM25 检索数据库
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_PY="$ROOT_DIR/client.py"
CLAUDE_HOOK="$ROOT_DIR/hooks/claude/stop.sh"

echo "=================================================="
echo "    One Super-Me (超级我) 安装器 (Installer)"
echo "=================================================="

# 1. 环境依赖检测
if ! command -v python3 >/dev/null 2>&1; then
    echo "❌ 错误: 未检测到 python3，请先安装 Python 3 环境。"
    exit 1
fi

python3 -c "import sqlite3" >/dev/null 2>&1 || {
    echo "❌ 错误: Python 缺少 sqlite3 模块支持。"
    exit 1
}
echo "✅ Python 3 与 SQLite 环境检测通过"

# 2. 初始化本地通用配置文件
CONFIG_DIR="$HOME/.config/one-super-me"
CONFIG_FILE="$CONFIG_DIR/config.env"
mkdir -p "$CONFIG_DIR"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "⚙️ 初始化通用大模型与海马体配置: $CONFIG_FILE"
    # 从当前环境变量推断默认值（若有）
    DEFAULT_BASE_URL="${OPENAI_BASE_URL:-${AI_API:-}}"
    DEFAULT_API_KEY="${OPENAI_API_KEY:-${AI_API_KEY:-}}"
    DEFAULT_MODEL="${OPENAI_MODEL:-${AI_MODEL:-mimo-v2.5}}"
    DEFAULT_REPO="${ONE_HIPPOCAMPUS_DIR:-$HOME/onespace/github/one-hippocampus}"

    cat <<EOF > "$CONFIG_FILE"
# One Super-Me 通用配置 (OpenAI 兼容格式，零硬编码)
# 大模型端点与凭据（支持任何兼容 OpenAI 格式的本地网关或云端 API）
OPENAI_BASE_URL="${DEFAULT_BASE_URL}"
OPENAI_API_KEY="${DEFAULT_API_KEY}"
OPENAI_MODEL="${DEFAULT_MODEL}"

# 海马体持久化数据仓绝对路径
ONE_HIPPOCAMPUS_DIR="${DEFAULT_REPO}"
EOF
    echo "   已生成配置文件模板，后续可根据需要随时编辑该文件。"
else
    echo "ℹ️ 已存在配置文件: $CONFIG_FILE"
fi

# 3. 宿主环境检测与后壳挂接
# 3.1 Claude Code 后壳挂接 (~/.claude/settings.json)
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
if [ -f "$CLAUDE_SETTINGS" ]; then
    echo "🔍 检测到 Claude Code 配置，正在安全挂接 Stop 后壳..."
    python3 - <<PY
import json
import os

settings_path = os.path.expanduser("$CLAUDE_SETTINGS")
hook_script = "$CLAUDE_HOOK"

try:
    with open(settings_path, "r", encoding="utf-8") as f:
        data = json.load(f)
except Exception as e:
    print("   [!] 读取 settings.json 失败:", e)
    exit(0)

if "hooks" not in data:
    data["hooks"] = {}

stop_hooks = data["hooks"].get("Stop", [])
already_installed = False

for item in stop_hooks:
    for h in item.get("hooks", []):
        if "one-super-me" in h.get("command", ""):
            already_installed = True
            break

if not already_installed:
    new_hook = {
        "hooks": [
            {
                "type": "command",
                "command": f'bash "{hook_script}"',
                "timeout": 15
            }
        ]
    }
    stop_hooks.append(new_hook)
    data["hooks"]["Stop"] = stop_hooks
    with open(settings_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("   ✅ 已成功向 Claude Code Stop 事件注入 Super-Me 后壳")
else:
    print("   ℹ️ Claude Code Stop 后壳已存在，跳过注入")
PY
fi

# 4. 全局技能软链接分发
for target_skills_dir in "$HOME/.claude/skills" "$HOME/.agents/skills"; do
    if [ -d "$target_skills_dir" ]; then
        link_path="$target_skills_dir/one-super-me"
        if [ ! -e "$link_path" ]; then
            ln -s "$ROOT_DIR" "$link_path"
            echo "🔗 已建立全局技能软链接: $link_path -> $ROOT_DIR"
        else
            echo "ℹ️ 全局技能软链接已存在: $link_path"
        fi
    fi
done

# 5. 初始化构建海马体本地 BM25 检索库
echo "📦 正在初始化海马体 BM25 检索索引..."
python3 "$CLIENT_PY" rebuild

echo "=================================================="
echo "🎉 One Super-Me (超级我) 安装完成！"
echo "   - 配置文件: $CONFIG_FILE"
echo "   - 客户端工具: $CLIENT_PY"
echo "   - 后壳脚本: $CLAUDE_HOOK"
echo "=================================================="
