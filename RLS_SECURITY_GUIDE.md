# Row Level Security (RLS) Setup Guide

## 🔒 Critical Security Issue Fixed

**Problem**: All 51 tables in the public schema had RLS disabled, exposing data to unauthorized access via Supabase's PostgREST API.

**Solution**: Enabled RLS on all tables and created workspace-scoped policies.

---

## 📋 What Was Fixed

### 1. Enabled RLS on All Tables
- All public tables now have RLS enabled
- Prevents unauthorized access through PostgREST API
- Provides defense in depth alongside application-level security

### 2. Created Workspace-Scoped Policies
- Users can only access data from workspaces they're members of
- Policies match your app's workspace-based access control model
- Prevents cross-workspace data leakage

---

## ⚠️ Important Notes

### Service Role Bypass
**Your Prisma queries WILL continue to work** because:
- Prisma uses the service role connection string (`DATABASE_URL`)
- Service role bypasses RLS policies
- This is by design - Prisma needs full database access

### RLS Protects PostgREST API
RLS policies protect against:
- Direct PostgREST API access (if enabled in Supabase)
- Supabase's auto-generated REST API
- Any direct database connections using JWT authentication

### Application-Level Security Still Applies
Your existing security layers still work:
- `assertAccess()` - Workspace membership checks
- `scopingMiddleware` - Workspace scoping for Prisma queries
- These protect against issues even with service role access

---

## 🚀 How to Apply

### Option 1: Run Migration (Recommended)
```bash
# Apply the migration to your database
npx prisma migrate deploy
```

### Option 2: Manual Application
If you prefer to apply manually:
1. Open Supabase SQL Editor
2. Copy the migration file content
3. Run it in the SQL Editor

---

## 🧪 Testing

After applying RLS:

1. **Test Application Still Works**
   - All Prisma queries should work (service role bypasses RLS)
   - No code changes needed
   - Your existing access control still applies

2. **Verify RLS is Active**
   ```sql
   -- Check if RLS is enabled on a table
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND rowsecurity = true;
   ```

3. **Test Policies**
   - Try accessing data via PostgREST API (if enabled)
   - Should be blocked unless user is workspace member

---

## 📊 Policy Structure

### Workspace-Scoped Tables
These tables use `has_workspace_access()` function:
- `projects` - Members can CRUD
- `tasks` - Members can CRUD  
- `wiki_pages` - Members can CRUD
- `chat_sessions` - Members can CRUD
- `activities` - Members can view, system can create
- `epics` - Members can CRUD

### Relationship Tables
These check parent table access:
- `project_members` - Via project → workspace
- `subtasks` - Via task → workspace
- `task_comments` - Via task → workspace
- `wiki_comments` - Via wiki_page → workspace
- `milestones` - Via project → workspace

### User Tables
- `users` - Can only see/update own profile
- `workspaces` - Can see workspaces they're members of
- `workspace_members` - Can see memberships for their workspaces

---

## 🔧 Customization

### Adjust Policies for Your Needs

If you need different access rules, edit the migration file:

```sql
-- Example: More restrictive project access
CREATE POLICY "Only project members can view projects"
  ON public.projects FOR SELECT
  USING (
    public.has_workspace_access("workspaceId", auth.uid()::text)
    AND EXISTS (
      SELECT 1 FROM public.project_members
      WHERE "projectId" = projects.id
      AND "userId" = auth.uid()::text
    )
  );
```

---

## ❓ FAQ

### Q: Will this break my app?
**A**: No. Prisma uses service role which bypasses RLS. Your app will work exactly as before.

### Q: Do I need to change my code?
**A**: No. Your application-level access control (`assertAccess`, scoping middleware) still works and is still needed.

### Q: What does RLS actually protect?
**A**: Protects against direct PostgREST API access. If someone gets your Supabase anon key, they still can't access other workspaces' data.

### Q: Should I disable PostgREST API?
**A**: Recommended. If you're not using it, disable it in Supabase settings for extra security.

---

## 📚 Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [RLS Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Policy Examples](https://supabase.com/docs/guides/database/postgres/row-level-security#policy-examples)

---

## ✅ Next Steps

1. **Apply the migration** (see above)
2. **Test your application** - Everything should work as before
3. **Verify RLS is enabled** - Check in Supabase dashboard
4. **Monitor logs** - Watch for any unexpected access denials
5. **Consider disabling PostgREST API** - If not using it

---

## 🔐 Security Layers

Your app now has **3 layers of security**:

1. **RLS (Database Level)** - Prevents unauthorized PostgREST access ✅
2. **Application Access Control** - `assertAccess()` checks workspace membership ✅
3. **Prisma Scoping Middleware** - Ensures workspace context on all queries ✅

This provides defense in depth - even if one layer fails, others protect your data.

