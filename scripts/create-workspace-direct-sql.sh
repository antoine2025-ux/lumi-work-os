#!/bin/bash
# Direct SQL script to create workspace - bypasses Prisma entirely
# Usage: ./scripts/create-workspace-direct-sql.sh <user-email> <workspace-name> <workspace-slug>

set -e

EMAIL="$1"
WORKSPACE_NAME="$2"
WORKSPACE_SLUG="$3"

if [ -z "$EMAIL" ] || [ -z "$WORKSPACE_NAME" ] || [ -z "$WORKSPACE_SLUG" ]; then
  echo "Usage: $0 <user-email> <workspace-name> <workspace-slug>"
  echo "Example: $0 skvortsovaleksei@gmail.com \"My Workspace\" my-workspace"
  exit 1
fi

echo "🔍 Looking up user: $EMAIL"

# Find user ID
USER_ID=$(docker compose exec -T postgres psql -U lumi_user -d lumi_work_os -t -c "SELECT id FROM users WHERE email = '$EMAIL';" 2>/dev/null | tr -d '[:space:]' || echo "")

if [ -z "$USER_ID" ]; then
  echo "📝 User not found, creating user account..."
  
  # Generate a user ID
  USER_ID="user_$(date +%s)_$(openssl rand -hex 4)"
  
  # Extract name from email (use part before @)
  NAME=$(echo "$EMAIL" | cut -d'@' -f1 | sed 's/[^a-zA-Z0-9]/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')
  
  echo "   Creating user: $NAME ($EMAIL)"
  echo "   User ID: $USER_ID"
  
  # Create user
  docker compose exec -T postgres psql -U lumi_user -d lumi_work_os <<EOF
INSERT INTO users (id, email, name, "emailVerified", "createdAt", "updatedAt")
VALUES ('$USER_ID', '$EMAIL', '$NAME', NOW(), NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET name = '$NAME', "updatedAt" = NOW();
EOF
  
  echo "✅ User created successfully!"
else
  echo "✅ Found existing user ID: $USER_ID"
fi

# Check if user already has a workspace
EXISTING=$(docker compose exec -T postgres psql -U lumi_user -d lumi_work_os -t -c "SELECT COUNT(*) FROM workspace_members WHERE \"userId\" = '$USER_ID';" | tr -d '[:space:]')

if [ "$EXISTING" != "0" ]; then
  echo "⚠️  User already has a workspace"
  EXISTING_WORKSPACE=$(docker compose exec -T postgres psql -U lumi_user -d lumi_work_os -t -c "SELECT w.name FROM workspaces w JOIN workspace_members wm ON w.id = wm.\"workspaceId\" WHERE wm.\"userId\" = '$USER_ID' LIMIT 1;" | tr -d '[:space:]')
  echo "   Existing workspace: $EXISTING_WORKSPACE"
  exit 0
fi

# Generate IDs
WORKSPACE_ID="ws_$(date +%s)_$(openssl rand -hex 4)"
MEMBER_ID="wm_$(date +%s)_$(openssl rand -hex 4)"

echo "📦 Creating workspace: $WORKSPACE_NAME"
echo "   Slug: $WORKSPACE_SLUG"
echo "   Workspace ID: $WORKSPACE_ID"

# Escape single quotes in workspace name for SQL
ESCAPED_WORKSPACE_NAME=$(echo "$WORKSPACE_NAME" | sed "s/'/''/g")

# Create workspace
docker compose exec -T postgres psql -U lumi_user -d lumi_work_os <<EOF
INSERT INTO workspaces (id, name, slug, description, "ownerId", "createdAt", "updatedAt")
VALUES ('$WORKSPACE_ID', '$ESCAPED_WORKSPACE_NAME', '$WORKSPACE_SLUG', 'Development workspace', '$USER_ID', NOW(), NOW());
EOF

if [ $? -ne 0 ]; then
  echo "❌ Failed to create workspace"
  exit 1
fi

# Create workspace member
docker compose exec -T postgres psql -U lumi_user -d lumi_work_os <<EOF
INSERT INTO workspace_members (id, "userId", "workspaceId", role, "joinedAt")
VALUES ('$MEMBER_ID', '$USER_ID', '$WORKSPACE_ID', 'OWNER', NOW());
EOF

if [ $? -ne 0 ]; then
  echo "❌ Failed to create workspace member"
  exit 1
fi

echo "✅ Workspace created successfully!"
echo "   Workspace ID: $WORKSPACE_ID"
echo "   Workspace Name: $WORKSPACE_NAME"
echo "   Workspace Slug: $WORKSPACE_SLUG"
echo ""
echo "🎉 You can now access your workspace at: http://localhost:3000/home"

