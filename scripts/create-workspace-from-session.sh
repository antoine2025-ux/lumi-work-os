#!/bin/bash
# Create workspace directly from SQL - bypasses Prisma entirely
# This script gets user info from NextAuth session and creates workspace via SQL

set -e

echo "🔍 Getting session info..."

# Try to get session from the API
SESSION_JSON=$(curl -s http://localhost:3000/api/auth/session 2>/dev/null || echo "{}")

if [ "$SESSION_JSON" = "{}" ] || [ -z "$SESSION_JSON" ]; then
  echo "❌ Could not get session. Please make sure:"
  echo "   1. You are logged in at http://localhost:3000"
  echo "   2. The dev server is running"
  echo ""
  echo "Alternatively, run:"
  echo "  ./scripts/create-workspace-direct-sql.sh <email> \"Workspace Name\" workspace-slug"
  exit 1
fi

# Extract email and name (basic parsing - assumes JSON format)
EMAIL=$(echo "$SESSION_JSON" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
NAME=$(echo "$SESSION_JSON" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
USER_ID=$(echo "$SESSION_JSON" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$EMAIL" ]; then
  echo "❌ Could not extract email from session"
  echo "Session data: $SESSION_JSON"
  exit 1
fi

echo "✅ Found session:"
echo "   Email: $EMAIL"
echo "   Name: $NAME"
echo "   User ID: $USER_ID"

# Check if user exists in database
EXISTING_USER=$(docker compose exec -T postgres psql -U lumi_user -d lumi_work_os -t -c "SELECT id FROM users WHERE email = '$EMAIL';" 2>/dev/null | tr -d '[:space:]' || echo "")

if [ -z "$EXISTING_USER" ]; then
  echo "📝 User doesn't exist in database, creating..."
  
  if [ -z "$USER_ID" ]; then
    # Generate a user ID
    USER_ID="user_$(date +%s)_$(openssl rand -hex 4)"
  fi
  
  docker compose exec -T postgres psql -U lumi_user -d lumi_work_os <<EOF
INSERT INTO users (id, email, name, "emailVerified", "createdAt", "updatedAt")
VALUES ('$USER_ID', '$EMAIL', '$NAME', NOW(), NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET name = '$NAME', "updatedAt" = NOW();
EOF
  
  echo "✅ User created: $USER_ID"
else
  USER_ID="$EXISTING_USER"
  echo "✅ User already exists: $USER_ID"
fi

# Check if user already has a workspace
EXISTING_WORKSPACE=$(docker compose exec -T postgres psql -U lumi_user -d lumi_work_os -t -c "SELECT w.id FROM workspaces w JOIN workspace_members wm ON w.id = wm.\"workspaceId\" WHERE wm.\"userId\" = '$USER_ID' LIMIT 1;" 2>/dev/null | tr -d '[:space:]' || echo "")

if [ -n "$EXISTING_WORKSPACE" ]; then
  WORKSPACE_NAME=$(docker compose exec -T postgres psql -U lumi_user -d lumi_work_os -t -c "SELECT name FROM workspaces WHERE id = '$EXISTING_WORKSPACE';" 2>/dev/null | tr -d '[:space:]')
  echo "⚠️  User already has a workspace: $WORKSPACE_NAME"
  echo "   Workspace ID: $EXISTING_WORKSPACE"
  exit 0
fi

# Create workspace
WORKSPACE_NAME="${NAME}'s Workspace"
WORKSPACE_SLUG=$(echo "$EMAIL" | cut -d'@' -f1 | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g')
WORKSPACE_ID="ws_$(date +%s)_$(openssl rand -hex 4)"
MEMBER_ID="wm_$(date +%s)_$(openssl rand -hex 4)"

echo "📦 Creating workspace:"
echo "   Name: $WORKSPACE_NAME"
echo "   Slug: $WORKSPACE_SLUG"
echo "   Workspace ID: $WORKSPACE_ID"

docker compose exec -T postgres psql -U lumi_user -d lumi_work_os <<EOF
INSERT INTO workspaces (id, name, slug, description, "ownerId", "createdAt", "updatedAt")
VALUES ('$WORKSPACE_ID', '$WORKSPACE_NAME', '$WORKSPACE_SLUG', 'Development workspace', '$USER_ID', NOW(), NOW());

INSERT INTO workspace_members (id, "userId", "workspaceId", role, "joinedAt")
VALUES ('$MEMBER_ID', '$USER_ID', '$WORKSPACE_ID', 'OWNER', NOW());
EOF

echo ""
echo "✅ Workspace created successfully!"
echo "   Workspace ID: $WORKSPACE_ID"
echo "   Workspace Name: $WORKSPACE_NAME"
echo "   Workspace Slug: $WORKSPACE_SLUG"
echo ""
echo "🎉 You can now access your workspace!"
echo "   Refresh your browser at http://localhost:3000"

