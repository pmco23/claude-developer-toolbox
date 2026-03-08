#!/usr/bin/env bash
# session-end-pack.sh
# SessionEnd hook: packs the codebase into three targeted Repomix snapshots
# (code, docs, full) so the next session's /qa has fresh snapshots with a
# refreshed packedAt timestamp.
#
# Skips silently if:
#   - repomix is not installed
#   - no .pipeline/ directory exists (no active pipeline project)
#   - CLAUDE.md contains "session-end-pack: disabled"

REPOMIX_BIN="${REPOMIX_BIN:-repomix}"
command -v "$REPOMIX_BIN" >/dev/null 2>&1 || exit 0

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HOOKS_DIR/lib/find-project.sh"

# Check for opt-out in CLAUDE.md
CLAUDE_MD=$(find_file_up "CLAUDE.md") || CLAUDE_MD=""
if [ -n "$CLAUDE_MD" ]; then
  grep -qiE '^session-end-pack:\s*disabled' "$CLAUDE_MD" 2>/dev/null && exit 0
fi

PROJECT_ROOT=$(find_project_root) || exit 0
PIPELINE_DIR="$PROJECT_ROOT/.pipeline"

PACK_SCRIPT="$HOOKS_DIR/../skills/pack/scripts/repomix-pack.js"
command -v node >/dev/null 2>&1 || exit 0
[ -f "$PACK_SCRIPT" ] || exit 0

node "$PACK_SCRIPT" \
  --source "$PROJECT_ROOT" \
  --pipeline-dir "$PIPELINE_DIR" \
  --timeout-sec 60 \
  --quiet \
  >/dev/null 2>&1 || true

exit 0
