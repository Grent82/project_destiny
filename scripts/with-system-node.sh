#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_BIN="$("$SCRIPT_DIR/find-system-node.sh")"
NODE_DIR="$(dirname "$NODE_BIN")"

export PATH="$NODE_DIR:$PATH"

exec "$@"
