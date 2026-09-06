#!/usr/bin/env bash
# One Super-Me: 会话生命周期钩子 (Stop Hook)
# 职责：当目标 Agent（如 Claude Code、OMP）会话结束时，捕获增量并调用 client.py ingest 提炼落库
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_PY="$SCRIPT_DIR/client.py"

# 支持自检模式：./hook.sh --test
if [ "${1:-}" = "--test" ]; then
    echo "=================================================="
    echo "🧪 One Super-Me 钩子功能自检"
    echo "=================================================="
    TEST_INPUT="测试知识点：小明在本地部署了自动化测试服务，访问端口 29090，执行脚本是 ~/bin/test-service.sh"
    echo "1. 模拟输入测试文本: $TEST_INPUT"
    python3 "$CLIENT_PY" ingest --text "$TEST_INPUT"
    echo "2. 测试检索刚沉淀的知识..."
    python3 "$CLIENT_PY" search "29090"
    # 清理测试数据
    REPO_DIR="$(python3 -c "import sys; sys.path.insert(0, '$SCRIPT_DIR'); import client; print(client.get_hippocampus_dir())")"
    find "$REPO_DIR/memory/locations" -name "*自动化测试*" -type f -delete 2>/dev/null || true
    python3 "$CLIENT_PY" rebuild >/dev/null 2>&1
    echo "=================================================="
    echo "✅ 钩子与海马体数据流自检完成，一切正常！"
    exit 0
fi

# 正常 Hook 触发：从标准输入读取 Agent 传入的会话内容
PAYLOAD=$(cat 2>/dev/null || true)
if [ -z "$PAYLOAD" ]; then
    exit 0
fi

# 异步传入 client.py ingest，防止阻塞 Agent 退出
echo "$PAYLOAD" | python3 "$CLIENT_PY" ingest >/dev/null 2>&1 &
exit 0
