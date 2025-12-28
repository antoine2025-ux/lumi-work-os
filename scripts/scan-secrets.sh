#!/bin/bash

# Secret Scanner for Loopwell
# Detects hardcoded secrets, API keys, and sensitive data in source code
# Run: npm run security:secrets

set -e

echo "🔍 Scanning for hardcoded secrets..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directories to scan
SCAN_DIRS="src"

FOUND_SECRETS=0
WARNINGS=0

# Function to search for a pattern
search_pattern() {
  local name="$1"
  local pattern="$2"
  
  RESULTS=$(grep -rEn \
    --exclude="*.lock" \
    --exclude="*.log" \
    --exclude="*.md" \
    --exclude="*.json" \
    --exclude-dir="node_modules" \
    --exclude-dir=".next" \
    --exclude-dir=".git" \
    --exclude-dir="test" \
    "$pattern" $SCAN_DIRS 2>/dev/null || true)
  
  if [ -n "$RESULTS" ]; then
    # Filter out false positives (comments, examples, process.env)
    FILTERED=$(echo "$RESULTS" | grep -v "process\.env\." | grep -v "// " | grep -v "example" | grep -v "placeholder" | grep -v "\.d\.ts:" || true)
    
    if [ -n "$FILTERED" ]; then
      echo -e "${RED}❌ Potential $name found:${NC}"
      echo "$FILTERED" | head -5
      echo ""
      FOUND_SECRETS=$((FOUND_SECRETS + 1))
    fi
  fi
}

# Check for various secret patterns
search_pattern "AWS Access Key" 'AKIA[0-9A-Z]{16}'
search_pattern "Private Key" '-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----'
search_pattern "GitHub Token" 'ghp_[A-Za-z0-9]{36}'
search_pattern "Slack Token" 'xox[baprs]-[A-Za-z0-9-]+'
search_pattern "Google API Key" 'AIza[0-9A-Za-z\-_]{35}'
search_pattern "OpenAI Key" 'sk-[A-Za-z0-9]{48}'
search_pattern "Stripe Live Key" 'sk_live_[A-Za-z0-9]{24,}'
search_pattern "Generic API Key" '[aA][pP][iI][_-]?[kK][eE][yY].*[:=].*["'"'"'][A-Za-z0-9_\-]{20,}["'"'"']'
search_pattern "Generic Secret" '[sS][eE][cC][rR][eE][tT][_-]?[kK][eE][yY].*[:=].*["'"'"'][A-Za-z0-9_\-]{20,}["'"'"']'
# Skip password pattern as it has too many false positives with form labels
# search_pattern "Password in Code" '[pP][aA][sS][sS][wW][oO][rR][dD].*[:=].*["'"'"'][^"'"'"']{8,}["'"'"']'

# Check for console.log with sensitive variable names
echo "🔍 Checking for sensitive data in logs..."
SENSITIVE_LOGS=$(grep -rEn \
  --exclude="*.lock" \
  --exclude="*.log" \
  --exclude-dir="node_modules" \
  --exclude-dir=".next" \
  --exclude-dir=".git" \
  --exclude-dir="test" \
  'console\.(log|info|debug)\(.*([tT]oken|[sS]ecret|[pP]assword|[aA]pi[Kk]ey)' $SCAN_DIRS 2>/dev/null | grep -v "// " || true)

if [ -n "$SENSITIVE_LOGS" ]; then
  echo -e "${YELLOW}⚠️  Potential sensitive data in logs:${NC}"
  echo "$SENSITIVE_LOGS" | head -5
  echo ""
  WARNINGS=$((WARNINGS + 1))
fi

# Summary
echo "=================================="
if [ $FOUND_SECRETS -gt 0 ]; then
  echo -e "${RED}❌ Found $FOUND_SECRETS potential secret(s)${NC}"
  echo ""
  echo "Please:"
  echo "  1. Move secrets to environment variables"
  echo "  2. Use .env.local for local development"
  echo "  3. Never commit secrets to version control"
  echo ""
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Found $WARNINGS warning(s) - review recommended${NC}"
  exit 0
else
  echo -e "${GREEN}✅ No hardcoded secrets detected${NC}"
  exit 0
fi
