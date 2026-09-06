#!/usr/bin/env bash
# One Super-Me: OMP / Pi Agent Stop Hook
# 触发时机：OMP 事件完成时
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_PY="$(cd "$SCRIPT_DIR/../../" && pwd)/client.py"

PAYLOAD=$(cat 2>/dev/null || true)
if [ -z "$PAYLOAD" ]; then
    exit 0
fi

echo "$PAYLOAD" | python3 "$CLIENT_PY" ingest >/dev/null 2>&1 &
exit 0
