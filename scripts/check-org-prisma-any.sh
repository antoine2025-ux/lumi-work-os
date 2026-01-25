#!/bin/bash
# Baseline-based check for "prisma as any" patterns in Org server modules.
#
# This script scans src/server/org/** for "prisma as any" patterns and compares
# against a committed baseline. CI fails only if NEW violations are found.
#
# Usage:
#   ./scripts/check-org-prisma-any.sh           # Check mode (CI)
#   ./scripts/check-org-prisma-any.sh --update-baseline  # Regenerate baseline (local only)
#
# Exit codes:
#   0 = No new violations (or baseline updated successfully)
#   1 = New violations found / error
#
# See: docs/quality/ORG_PRISMA_ANY_GUARDRAIL.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BASELINE_FILE="$SCRIPT_DIR/baselines/org-prisma-any.txt"
SEARCH_DIR="src/server/org"
PATTERN="prisma as any"
TEMP_CURRENT=$(mktemp)

# Cleanup temp file on exit
trap "rm -f $TEMP_CURRENT" EXIT

# Detect CI environment
IS_CI="${CI:-false}"

# Generate current violations in normalized format (path:line)
generate_current() {
  cd "$REPO_ROOT"
  grep -rn "$PATTERN" "$SEARCH_DIR" 2>/dev/null \
    | cut -d: -f1,2 \
    | sort -u \
    || true  # Don't fail if no matches
}

# Extract just the path:line entries from baseline (ignore comments/blanks)
extract_baseline_entries() {
  grep -v "^#" "$BASELINE_FILE" 2>/dev/null \
    | grep -v "^$" \
    | sort -u \
    || true
}

# Validate baseline file exists and has entries
validate_baseline() {
  if [[ ! -f "$BASELINE_FILE" ]]; then
    echo "❌ ERROR: Baseline file not found: $BASELINE_FILE"
    echo ""
    echo "The baseline file is required for this check to work."
    echo "To create it, run locally:"
    echo "  npm run check:org-prisma-any:update"
    echo ""
    echo "Then commit the generated file."
    return 1
  fi

  local entry_count
  entry_count=$(extract_baseline_entries | wc -l | tr -d ' ')
  
  if [[ "$entry_count" -eq 0 ]]; then
    echo "⚠️  WARNING: Baseline file exists but has no entries."
    echo "   This means either all violations are fixed (great!) or the file is corrupted."
    echo "   If unexpected, regenerate with: npm run check:org-prisma-any:update"
    echo ""
  fi
  
  return 0
}

# Update baseline mode
if [[ "${1:-}" == "--update-baseline" ]]; then
  # Block in CI
  if [[ "$IS_CI" == "true" ]]; then
    echo "❌ ERROR: --update-baseline is not allowed in CI."
    echo ""
    echo "Baseline updates must be done locally and committed intentionally."
    echo "This prevents accidentally hiding new violations."
    echo ""
    echo "To fix:"
    echo "  1. Run locally: npm run check:org-prisma-any:update"
    echo "  2. Review the changes"
    echo "  3. Commit the updated baseline file"
    exit 1
  fi

  echo "📝 Updating baseline file: $BASELINE_FILE"
  echo "   Scope: $SEARCH_DIR/**"
  echo ""
  
  # Ensure directory exists
  mkdir -p "$(dirname "$BASELINE_FILE")"
  
  # Generate header
  cat > "$BASELINE_FILE" << 'EOF'
# Baseline: prisma as any violations in src/server/org/**
# Format: <path>:<line>
# To update: npm run check:org-prisma-any:update
#
# These are known legacy violations. CI fails only if NEW violations appear.
# Goal: Reduce this list over time by fixing files and removing entries.

EOF
  
  # Append current violations
  generate_current >> "$BASELINE_FILE"
  
  # Count entries
  ENTRY_COUNT=$(extract_baseline_entries | wc -l | tr -d ' ')
  
  echo "✅ Baseline updated with $ENTRY_COUNT known violations."
  echo "   Commit $BASELINE_FILE to track the new baseline."
  exit 0
fi

# Check mode (default)
echo "🔍 Checking for 'prisma as any' violations"
echo "   Scope: $SEARCH_DIR/**"
echo "   Baseline: $BASELINE_FILE"
echo ""

# Validate baseline
if ! validate_baseline; then
  exit 1
fi

# Generate current violations
generate_current > "$TEMP_CURRENT"
CURRENT_COUNT=$(wc -l < "$TEMP_CURRENT" | tr -d ' ')

# Extract baseline entries
BASELINE_ENTRIES=$(mktemp)
trap "rm -f $TEMP_CURRENT $BASELINE_ENTRIES" EXIT
extract_baseline_entries > "$BASELINE_ENTRIES"
BASELINE_COUNT=$(wc -l < "$BASELINE_ENTRIES" | tr -d ' ')

# Find NEW violations (in current but not in baseline)
NEW_VIOLATIONS=$(comm -23 "$TEMP_CURRENT" "$BASELINE_ENTRIES" || true)
NEW_COUNT=$(echo "$NEW_VIOLATIONS" | grep -c . || true)

# Find FIXED violations (in baseline but not in current)
FIXED_VIOLATIONS=$(comm -13 "$TEMP_CURRENT" "$BASELINE_ENTRIES" || true)
FIXED_COUNT=$(echo "$FIXED_VIOLATIONS" | grep -c . || true)

# Report results
echo "📊 Summary:"
echo "   Baseline violations: $BASELINE_COUNT"
echo "   Current violations:  $CURRENT_COUNT"
echo "   New violations:      $NEW_COUNT"
echo "   Fixed violations:    $FIXED_COUNT"
echo ""

# If there are fixed violations, suggest updating baseline
if [[ "$FIXED_COUNT" -gt 0 ]]; then
  echo "🎉 Good news! Some violations have been fixed:"
  echo "$FIXED_VIOLATIONS" | sed 's/^/   - /'
  echo ""
  echo "   Run locally: npm run check:org-prisma-any:update"
  echo "   to update the baseline and lock in your progress!"
  echo ""
fi

# Check for new violations
if [[ "$NEW_COUNT" -gt 0 ]]; then
  echo "❌ FAILED: Found $NEW_COUNT NEW 'prisma as any' violation(s):"
  echo ""
  echo "$NEW_VIOLATIONS" | sed 's/^/   /'
  echo ""
  echo "These violations are not in the baseline and must be fixed."
  echo "Options:"
  echo "  1. Fix the code to use properly typed Prisma models"
  echo "  2. If intentional (rare), update baseline locally:"
  echo "     npm run check:org-prisma-any:update"
  echo ""
  echo "See: docs/quality/ORG_PRISMA_ANY_GUARDRAIL.md"
  exit 1
fi

echo "✅ PASSED: No new 'prisma as any' violations."
exit 0
