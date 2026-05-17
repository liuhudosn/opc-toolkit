#!/usr/bin/env bash
# Phase 3 — ask Claude Code (headless) to review the working-tree diff.
# Writes a markdown report to .claude/reviews/<timestamp>.md
#
# Usage: ./scripts/review.sh [base-ref]   (default: HEAD)
set -euo pipefail

BASE="${1:-HEAD}"
mkdir -p .claude/reviews
TS=$(date +%Y%m%d-%H%M%S)
OUT=".claude/reviews/${TS}.md"

DIFF=$(git diff "$BASE" 2>/dev/null || true)
if [[ -z "$DIFF" ]]; then
  echo "No diff vs ${BASE}; nothing to review." >&2
  exit 0
fi

PROMPT="Review the following diff against the plan in ./PLAN.md (if present). Focus on:
- architecture drift / scope creep beyond the plan
- security issues (use the security-review skill if relevant)
- over-engineering, dead abstractions, unnecessary error handling
- bugs / broken invariants
- whether acceptance criteria in PLAN.md are actually met

Output a markdown report grouped by severity (must-fix / should-fix / nit). Be terse.

--- DIFF ---
$DIFF
--- END DIFF ---"

printf '%s' "$PROMPT" | claude -p > "$OUT"
echo "Review written to $OUT"
