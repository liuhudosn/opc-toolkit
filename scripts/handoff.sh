#!/usr/bin/env bash
# Phase 2 — hand PLAN.md to opencode + omo for execution.
# Usage: ./scripts/handoff.sh [plan-file]   (default: ./PLAN.md)
#
# Prereqs:
#   - opencode installed, omo plugin enabled in ~/.config/opencode/opencode.json
#   - $QINIU_API_KEY exported
set -euo pipefail

PLAN="${1:-PLAN.md}"
if [[ ! -f "$PLAN" ]]; then
  echo "Plan file not found: $PLAN" >&2
  echo "Tip: copy PLAN.md.template to PLAN.md and fill it in (or ask Claude Code to draft one)." >&2
  exit 1
fi

PROMPT="Execute the plan in the attached file faithfully. Do not invent extra changes outside its scope. If you discover the plan is wrong, stop and report instead of improvising.

--- PLAN ---
$(cat "$PLAN")
--- END PLAN ---"

opencode run "$PROMPT"
