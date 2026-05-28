#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

exec "$SCRIPT_DIR/with-system-node.sh" \
  "$PROJECT_ROOT/node_modules/.bin/vitest" run "$@"
