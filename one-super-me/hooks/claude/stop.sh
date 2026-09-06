#!/usr/bin/env bash
# One Super-Me: Claude Code Stop Hook
# 触发时机：Claude Code 会话完成 / Stop 事件发生时
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_PY="$(cd "$SCRIPT_DIR/../../" && pwd)/client.py"

# 读取标准输入 payload (若存在)
PAYLOAD=$(cat 2>/dev/null || true)
if [ -z "$PAYLOAD" ]; then
    exit 0
fi

# 异步传入 client.py ingest，防止阻塞终端退出
echo "$PAYLOAD" | python3 "$CLIENT_PY" ingest >/dev/null 2>&1 &
exit 0
