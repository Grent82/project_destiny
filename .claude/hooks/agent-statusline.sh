#!/bin/bash

set -euo pipefail

STATE_FILE="${CLAUDE_AGENT_MONITOR_STATE:-/tmp/claude-agent-monitor.json}"
INPUT="$(cat)"
MODEL="$(printf '%s' "$INPUT" | jq -r '.model.display_name // "Claude"')"
CONTEXT_PCT="$(printf '%s' "$INPUT" | jq -r '(.context_window.used_percentage // 0) | floor')"
COST="$(printf '%s' "$INPUT" | jq -r '.cost.total_cost_usd // 0')"

ACTIVE_COUNT=0
ACTIVE_LABELS=""
LAST_TYPE=""
LAST_MESSAGE=""

if [ -f "$STATE_FILE" ]; then
  ACTIVE_COUNT="$(jq -r '.active | length' "$STATE_FILE")"
  ACTIVE_LABELS="$(jq -r '[.active[]?.type] | unique | join(", ")' "$STATE_FILE")"
  LAST_TYPE="$(jq -r '.history[0].type // empty' "$STATE_FILE")"
  LAST_MESSAGE="$(jq -r '.history[0].message // empty' "$STATE_FILE" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g' | cut -c1-90)"
fi

printf '[%s] %s%% ctx | $%s\n' "$MODEL" "$CONTEXT_PCT" "$COST"

if [ "$ACTIVE_COUNT" -gt 0 ]; then
  printf 'Active agents: %s' "$ACTIVE_COUNT"
  if [ -n "$ACTIVE_LABELS" ]; then
    printf ' [%s]' "$ACTIVE_LABELS"
  fi
  printf '\n'
elif [ -n "$LAST_TYPE" ]; then
  printf 'Last subagent: %s' "$LAST_TYPE"
  if [ -n "$LAST_MESSAGE" ]; then
    printf ' | %s' "$LAST_MESSAGE"
  fi
  printf '\n'
else
  printf 'No subagent activity yet\n'
fi
