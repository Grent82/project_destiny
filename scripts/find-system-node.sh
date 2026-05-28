#!/usr/bin/env bash
set -euo pipefail

for candidate in \
  "/opt/homebrew/bin/node" \
  "/usr/local/bin/node" \
  "/usr/bin/node"
do
  if [[ -x "$candidate" ]]; then
    echo "$candidate"
    exit 0
  fi
done

echo "No compatible system node found. Expected one of: /opt/homebrew/bin/node, /usr/local/bin/node, /usr/bin/node" >&2
exit 1
