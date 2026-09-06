#!/usr/bin/env bash
# One Super-Me: 目标 Agent 钩子安装器 (Install Hook)
# 职责：
# 1. 明确选择/指定目标 Agent (Claude Code 或 OMP)
# 2. 透明引导与展示大模型配置与海马体数据仓路径 (~/.config/one-super-me/config.env)
# 3. 将 hook.sh 准确挂载至目标 Agent 的会话生命周期事件中
# 4. 输出包含自检指令的明确安装回执
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_PY="$SCRIPT_DIR/client.py"
HOOK_SCRIPT="$SCRIPT_DIR/hook.sh"
CONFIG_DIR="$HOME/.config/one-super-me"
CONFIG_FILE="$CONFIG_DIR/config.env"

TARGET_AGENT=""
CUSTOM_URL=""
CUSTOM_KEY=""
CUSTOM_MODEL=""
CUSTOM_REPO=""
NON_INTERACTIVE=false

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case "$1" in
        --agent|-a)
            TARGET_AGENT="$2"
            shift 2
            ;;
        --url)
            CUSTOM_URL="$2"
            shift 2
            ;;
        --key)
            CUSTOM_KEY="$2"
            shift 2
            ;;
        --model|-m)
            CUSTOM_MODEL="$2"
            shift 2
            ;;
        --repo|-r)
            CUSTOM_REPO="$2"
            shift 2
            ;;
        --yes|-y|--non-interactive)
            NON_INTERACTIVE=true
            shift
            ;;
        --help|-h)
            echo "One Super-Me: Agent 钩子安装器"
            echo ""
            echo "用法:"
            echo "  ./install-hook.sh --agent claude              # 为 Claude Code 安装 Stop 钩子"
            echo "  ./install-hook.sh --agent omp                 # 为 OMP / Pi Agent 安装生命周期扩展"
            echo ""
            echo "可选自定义参数 (写入 ~/.config/one-super-me/config.env):"
            echo "  --url <URL>        大模型 API 端点 (如 https://api.openai.com/v1 或 http://localhost:11434/v1)"
            echo "  --key <KEY>        大模型 API Key"
            echo "  --model <MODEL>    大模型名称 (如 gpt-4o-mini 或 qwen2.5:7b)"
            echo "  --repo <PATH>      海马体仓库路径 (默认 ~/onespace/github/one-hippocampus)"
            echo "  -y, --yes          跳过交互确认，直接使用默认/指定参数"
            exit 0
            ;;
        *)
            echo "未知参数: $1，请使用 --help 查看帮助。"
            exit 1
            ;;
    esac
done

echo "=================================================================="
echo "      One Super-Me (超级我) 目标 Agent 钩子安装器"
echo "=================================================================="

# 1. 目标 Agent 选择
if [ -z "$TARGET_AGENT" ]; then
    if [ "$NON_INTERACTIVE" = true ]; then
        # 默认优先检测已有宿主
        if [ -d "$HOME/.claude" ]; then
            TARGET_AGENT="claude"
        elif [ -d "$HOME/.omp" ]; then
            TARGET_AGENT="omp"
        else
            TARGET_AGENT="claude"
        fi
    else
        echo "请选择你要把 Super-Me 记忆钩子安装到哪一个 Agent 宿主:"
        echo "  [1] Claude Code  (挂载至 ~/.claude/settings.json 的 Stop 钩子)"
        echo "  [2] OMP / Pi     (挂载至 ~/.omp/agent/extensions/ 扩展)"
        read -r -p "请输入选项 [1 或 2，默认 1]: " agent_choice
        case "$agent_choice" in
            2|omp|OMP)
                TARGET_AGENT="omp"
                ;;
            *)
                TARGET_AGENT="claude"
                ;;
        esac
    fi
fi

# 格式化 target agent
case "$TARGET_AGENT" in
    claude|Claude|claudecode)
        TARGET_AGENT="claude"
        ;;
    omp|OMP|pi|Pi)
        TARGET_AGENT="omp"
        ;;
    *)
    echo "❌ 不支持的 Agent 宿主: $TARGET_AGENT (支持: claude, omp)"
    exit 1
    ;;
esac

echo "🎯 目标 Agent 确认为: $TARGET_AGENT"

# 2. 配置管理 (~/.config/one-super-me/config.env)
mkdir -p "$CONFIG_DIR"

if [ ! -f "$CONFIG_FILE" ]; then
    echo ""
    echo "⚙️ 首次配置: 正在初始化大模型与海马体数据仓设置..."
    
    DEF_URL="${CUSTOM_URL:-${OPENAI_BASE_URL:-${AI_API:-https://api.openai.com/v1}}}"
    DEF_KEY="${CUSTOM_KEY:-${OPENAI_API_KEY:-${AI_API_KEY:-}}}"
    DEF_MODEL="${CUSTOM_MODEL:-${OPENAI_MODEL:-${AI_MODEL:-gpt-4o-mini}}}"
    DEF_REPO="${CUSTOM_REPO:-${ONE_HIPPOCAMPUS_DIR:-$HOME/onespace/github/one-hippocampus}}"
    [ ! -d "$DEF_REPO" ] && DEF_REPO="$HOME/one-hippocampus"

    cat <<EOF > "$CONFIG_FILE"
# One Super-Me 通用配置 (OpenAI 兼容格式，零硬编码)
# 大模型端点与凭据（支持任何兼容 OpenAI 格式的本地网关或云端 API）
OPENAI_BASE_URL="${DEF_URL}"
OPENAI_API_KEY="${DEF_KEY}"
OPENAI_MODEL="${DEF_MODEL}"

# 海马体持久化数据仓绝对路径
ONE_HIPPOCAMPUS_DIR="${DEF_REPO}"
EOF
    echo "   已生成配置文件: $CONFIG_FILE"
else
    # 若用户显式传入了覆盖参数，则更新 config.env
    if [ -n "$CUSTOM_URL" ] || [ -n "$CUSTOM_KEY" ] || [ -n "$CUSTOM_MODEL" ] || [ -n "$CUSTOM_REPO" ]; then
        echo "⚙️ 更新现有配置..."
        [ -n "$CUSTOM_URL" ] && sed -i "s|^OPENAI_BASE_URL=.*|OPENAI_BASE_URL=\"${CUSTOM_URL}\"|" "$CONFIG_FILE"
        [ -n "$CUSTOM_KEY" ] && sed -i "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=\"${CUSTOM_KEY}\"|" "$CONFIG_FILE"
        [ -n "$CUSTOM_MODEL" ] && sed -i "s|^OPENAI_MODEL=.*|OPENAI_MODEL=\"${CUSTOM_MODEL}\"|" "$CONFIG_FILE"
        [ -n "$CUSTOM_REPO" ] && sed -i "s|^ONE_HIPPOCAMPUS_DIR=.*|ONE_HIPPOCAMPUS_DIR=\"${CUSTOM_REPO}\"|" "$CONFIG_FILE"
    fi
fi

# 读取最终配置用于打印回执
ACTIVE_URL="$(grep '^OPENAI_BASE_URL=' "$CONFIG_FILE" | cut -d= -f2- | tr -d '"'\''')"
ACTIVE_MODEL="$(grep '^OPENAI_MODEL=' "$CONFIG_FILE" | cut -d= -f2- | tr -d '"'\''')"
ACTIVE_REPO="$(grep '^ONE_HIPPOCAMPUS_DIR=' "$CONFIG_FILE" | cut -d= -f2- | tr -d '"'\''')"

# 3. 挂载到指定 Agent
HOOK_TARGET_DESC=""

if [ "$TARGET_AGENT" = "claude" ]; then
    CLAUDE_DIR="$HOME/.claude"
    CLAUDE_SETTINGS="$CLAUDE_DIR/settings.json"
    mkdir -p "$CLAUDE_DIR"
    [ ! -f "$CLAUDE_SETTINGS" ] && echo "{}" > "$CLAUDE_SETTINGS"

    python3 - <<PY
import json
import os

settings_path = os.path.expanduser("$CLAUDE_SETTINGS")
hook_script = "$HOOK_SCRIPT"

try:
    with open(settings_path, "r", encoding="utf-8") as f:
        data = json.load(f)
except Exception:
    data = {}

if "hooks" not in data:
    data["hooks"] = {}

stop_hooks = data["hooks"].get("Stop", [])
clean_stops = []
for item in stop_hooks:
    keep = True
    for h in item.get("hooks", []):
        cmd = h.get("command", "")
        if "one-super-me" in cmd or "hook.sh" in cmd:
            keep = False
            break
    if keep:
        clean_stops.append(item)

clean_stops.append({
    "hooks": [
        {
            "type": "command",
            "command": f'bash "{hook_script}"',
            "timeout": 15
        }
    ]
})
data["hooks"]["Stop"] = clean_stops
with open(settings_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
PY
    HOOK_TARGET_DESC="$CLAUDE_SETTINGS (Stop 事件)"

    # 软链接技能目录
    if [ -d "$HOME/.claude/skills" ]; then
        ln -snf "$SCRIPT_DIR" "$HOME/.claude/skills/one-super-me"
    fi

elif [ "$TARGET_AGENT" = "omp" ]; then
    OMP_EXT_DIR="$HOME/.omp/agent/extensions"
    mkdir -p "$OMP_EXT_DIR"
    OMP_HOOK_FILE="$OMP_EXT_DIR/one-super-me-hook.ts"

    cat <<EOF > "$OMP_HOOK_FILE"
// @one-super-me-hook
import { spawn } from 'child_process';

export default function (pi: any) {
  const triggerHook = (context: any) => {
    try {
      const hookPath = '$HOOK_SCRIPT';
      const child = spawn('bash', [hookPath], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
    } catch (_) {}
  };

  if (typeof pi.on === 'function') {
    pi.on('session_end', async (_event: any, ctx: any) => triggerHook(ctx));
  }
}
EOF
    HOOK_TARGET_DESC="$OMP_HOOK_FILE (session_end 事件)"

    if [ -d "$HOME/.agents/skills" ]; then
        ln -snf "$SCRIPT_DIR" "$HOME/.agents/skills/one-super-me"
    fi
fi

# 4. 初始化 BM25 检索索引
echo "📦 同步海马体本地索引库..."
python3 "$CLIENT_PY" rebuild >/dev/null 2>&1 || true

# 5. 输出明确回执给小明
echo ""
echo "=================================================================="
echo "🎉 One Super-Me 钩子已成功安装！"
echo "=================================================================="
echo "🎯 目标 Agent:    $TARGET_AGENT"
echo "🪝 挂载位置:      $HOOK_TARGET_DESC"
echo "📜 钩子执行脚本:  $HOOK_SCRIPT"
echo "⚙️ 配置文件:      $CONFIG_FILE"
echo "🤖 提炼模型配置:  $ACTIVE_MODEL @ $ACTIVE_URL"
echo "🧠 海马体数据仓:  $ACTIVE_REPO"
echo "------------------------------------------------------------------"
echo "💡 小明如何自检与验证？"
echo "   请在终端直接执行一行自检命令："
echo "   $HOOK_SCRIPT --test"
echo "   若看到【钩子与海马体数据流自检完成】，即代表全链路 100% 畅通！"
echo "=================================================================="
