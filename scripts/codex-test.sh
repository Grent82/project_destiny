#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

ARGS=("$@")
HAS_MAX_WORKERS=0
for arg in "${ARGS[@]-}"; do
  case "$arg" in
    --maxWorkers|--maxWorkers=*)
      HAS_MAX_WORKERS=1
      break
      ;;
  esac
done

if [[ $HAS_MAX_WORKERS -eq 0 ]]; then
  if [[ ${#ARGS[@]} -eq 0 ]]; then
    ARGS=(--maxWorkers=4)
  else
    ARGS=(--maxWorkers=4 "${ARGS[@]}")
  fi
fi

exec env STORYBOOK_DISABLE_CHROMATIC=1 \
  "$SCRIPT_DIR/with-system-node.sh" \
  "$PROJECT_ROOT/node_modules/.bin/vitest" run "${ARGS[@]}"
