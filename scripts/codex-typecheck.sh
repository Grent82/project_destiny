#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

"$SCRIPT_DIR/with-system-node.sh" \
  "$PROJECT_ROOT/node_modules/.bin/tsc" --noEmit -p "$PROJECT_ROOT/tsconfig.app.json"

exec "$SCRIPT_DIR/with-system-node.sh" \
  "$PROJECT_ROOT/node_modules/.bin/tsc" --noEmit -p "$PROJECT_ROOT/tsconfig.node.json"
