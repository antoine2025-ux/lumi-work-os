# Quick Workspace Creation Fix

Since Prisma is having connection issues, use this SQL script to create your workspace directly:

## Option 1: Automatic (if you know your email)

Run this command, replacing `YOUR_EMAIL` with your Google email:

```bash
./scripts/create-workspace-direct-sql.sh YOUR_EMAIL "My Workspace" my-workspace
```

Example:
```bash
./scripts/create-workspace-direct-sql.sh skvortsovaleksei@gmail.com "Aleksei's Workspace" aleksei-workspace
```

## Option 2: Manual SQL

If the script doesn't work, run these SQL commands directly:

1. **Find your user ID** (replace `YOUR_EMAIL`):
```bash
docker compose exec -T postgres psql -U lumi_user -d lumi_work_os -c "SELECT id, email, name FROM users WHERE email = 'YOUR_EMAIL';"
```

2. **Create workspace** (replace `USER_ID` with the ID from step 1):
```bash
docker compose exec -T postgres psql -U lumi_user -d lumi_work_os <<EOF
-- Generate IDs
DO \$\$
DECLARE
  v_user_id TEXT := 'USER_ID';
  v_workspace_id TEXT := 'ws_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8);
  v_member_id TEXT := 'wm_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8);
BEGIN
  -- Create workspace
  INSERT INTO workspaces (id, name, slug, description, "ownerId", "createdAt", "updatedAt")
  VALUES (v_workspace_id, 'My Workspace', 'my-workspace', 'Development workspace', v_user_id, NOW(), NOW());
  
  -- Create workspace member
  INSERT INTO workspace_members (id, "userId", "workspaceId", role, "joinedAt")
  VALUES (v_member_id, v_user_id, v_workspace_id, 'OWNER', NOW());
  
  RAISE NOTICE 'Workspace created: %', v_workspace_id;
END \$\$;
EOF
```

3. **Verify workspace was created**:
```bash
docker compose exec -T postgres psql -U lumi_user -d lumi_work_os -c "SELECT w.id, w.name, w.slug FROM workspaces w JOIN workspace_members wm ON w.id = wm.\"workspaceId\" WHERE wm.\"userId\" = 'USER_ID';"
```

## After creating the workspace

1. Refresh your browser at `http://localhost:3000`
2. You should now see your workspace and be able to access the dashboard

