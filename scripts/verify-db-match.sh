#!/bin/bash
echo "🔍 Verifying Database Connection Match..."
echo ""

echo "1️⃣  Prisma CLI Database:"
CLI_DB=$(npm run print-db 2>&1 | grep "Database name" | awk '{print $3}')
CLI_PROJECTS=$(npm run print-db 2>&1 | grep "Projects:" | awk '{print $2}')
CLI_PAGES=$(npm run print-db 2>&1 | grep "WikiPages:" | awk '{print $2}')
CLI_SPACES=$(npm run print-db 2>&1 | grep "Spaces:" | awk '{print $2}')
echo "   Database: $CLI_DB"
echo "   Data: Projects=$CLI_PROJECTS, WikiPages=$CLI_PAGES, Spaces=$CLI_SPACES"
echo ""

echo "2️⃣  Runtime Database (requires dev server running):"
if curl -s http://localhost:3000/api/debug/db > /dev/null 2>&1; then
  RUNTIME_RESPONSE=$(curl -s http://localhost:3000/api/debug/db)
  RUNTIME_DB=$(echo "$RUNTIME_RESPONSE" | jq -r '.actualConnection.database')
  RUNTIME_PROJECTS=$(echo "$RUNTIME_RESPONSE" | jq -r '.dataVerification.projects')
  RUNTIME_PAGES=$(echo "$RUNTIME_RESPONSE" | jq -r '.dataVerification.wikiPages')
  RUNTIME_SPACES=$(echo "$RUNTIME_RESPONSE" | jq -r '.dataVerification.spaces')
  
  echo "   Database: $RUNTIME_DB"
  echo "   Data: Projects=$RUNTIME_PROJECTS, WikiPages=$RUNTIME_PAGES, Spaces=$RUNTIME_SPACES"
  echo ""
  
  if [ "$RUNTIME_DB" = "$CLI_DB" ]; then
    echo "✅ MATCH - Both using same database: $RUNTIME_DB"
    if [ "$RUNTIME_PROJECTS" = "$CLI_PROJECTS" ] && [ "$RUNTIME_PAGES" = "$CLI_PAGES" ] && [ "$RUNTIME_SPACES" = "$CLI_SPACES" ]; then
      echo "✅ Data counts match - Database connection verified!"
    else
      echo "⚠️  Data counts differ - May indicate schema mismatch"
    fi
  else
    echo "❌ MISMATCH!"
    echo "   Runtime: $RUNTIME_DB"
    echo "   CLI: $CLI_DB"
    echo ""
    echo "Fix: Update .env.local to match .env"
  fi
else
  echo "   ⚠️  Dev server not running"
  echo "   Start with: npm run dev"
  echo ""
  echo "   Once running, check: curl http://localhost:3000/api/debug/db"
fi
