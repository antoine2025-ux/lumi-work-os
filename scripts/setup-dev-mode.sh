#!/bin/bash

# Development API Update Script
# This script updates key API endpoints to use development authentication

echo "🔧 Updating API endpoints for development mode..."

# List of critical API endpoints to update
APIS=(
  "src/app/api/org/users/route.ts"
  "src/app/api/org/positions/[id]/route.ts"
  "src/app/api/workspaces/route.ts"
  "src/app/api/workspaces/[workspaceId]/user-role/route.ts"
  "src/app/api/projects/route.ts"
  "src/app/api/tasks/route.ts"
  "src/app/api/feature-flags/route.ts"
)

# Function to update an API file
update_api() {
  local file=$1
  if [ -f "$file" ]; then
    echo "  ✅ Updating $file"
    
    # Replace imports
    sed -i '' 's/import { getServerSession } from '\''next-auth'\''/import { requireDevAuth } from '\''@\/lib\/dev-auth'\''/g' "$file"
    sed -i '' 's/import { authOptions } from '\''@\/lib\/auth'\''//g' "$file"
    
    # Replace authentication checks
    sed -i '' 's/const session = await getServerSession(authOptions)/const session = await requireDevAuth(request)/g' "$file"
    sed -i '' '/if (!session?.user?.email) {/,/}/d' "$file"
    sed -i '' '/return NextResponse.json({ error: '\''Unauthorized'\'' }, { status: 401 })/d' "$file"
    
  else
    echo "  ⚠️  File not found: $file"
  fi
}

# Update each API file
for api in "${APIS[@]}"; do
  update_api "$api"
done

echo "🎉 Development mode setup complete!"
echo ""
echo "📋 What this does:"
echo "  • Bypasses authentication when ALLOW_DEV_LOGIN=true"
echo "  • Uses mock dev user for all API calls"
echo "  • Eliminates 'Unauthorized' errors in development"
echo ""
echo "🚀 You can now develop without authentication friction!"
