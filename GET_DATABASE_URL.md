# How to Get DATABASE_URL from Supabase

## Quick Steps

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard/project/ozpfuynytrnxazwxvrsg
   - Or go to https://supabase.com/dashboard → Select your project

2. **Navigate to Database Settings:**
   - Click **Settings** (gear icon) in the left sidebar
   - Click **Database** in the settings menu

3. **Get Connection String:**
   - Scroll down to **Connection string** section
   - Under **Connection pooling**, select **Transaction mode**
   - Copy the connection string (it looks like):
     ```
     postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
     ```

4. **Update `.env.local`:**
   - Open `.env.local` in your project root
   - Find the line: `DATABASE_URL="postgresql://postgres.REPLACE_WITH_YOUR_SUPABASE_PASSWORD@..."`
   - Replace `REPLACE_WITH_YOUR_SUPABASE_PASSWORD` with your actual Supabase database password
   - **OR** replace the entire `DATABASE_URL` line with the connection string you copied from Supabase

5. **Important:** Make sure the connection string includes:
   - `pgbouncer=true`
   - `sslmode=require`
   - `prepared_statements=false` (required for PgBouncer transaction mode)

6. **Restart Dev Server:**
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

## Alternative: Direct Connection (Not Recommended)

If you can't use the pooler, you can use the direct connection:
- Go to **Settings → Database → Connection string**
- Select **Direct connection** (not pooled)
- Copy that URL
- But note: Direct connections have connection limits and may not work well for development

## After Adding DATABASE_URL

Once you've added `DATABASE_URL` to `.env.local`:
1. Restart the dev server
2. Try creating the workspace again
3. It should work now!

