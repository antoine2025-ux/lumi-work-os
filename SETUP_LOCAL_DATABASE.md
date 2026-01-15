# Setup Local Database for Development

## Option 1: Using Docker (Recommended - Easiest)

### Step 1: Start Docker Desktop
1. Open **Docker Desktop** application on your Mac
2. Wait for it to fully start (the Docker icon in the menu bar should be green/active)

### Step 2: Start PostgreSQL Database
Once Docker Desktop is running, run:
```bash
docker-compose up -d
```

This will:
- Start a PostgreSQL database on `localhost:5432`
- Create a database named `lumi_work_os`
- Set up user `lumi_user` with password `lumi_password_change_me`

### Step 3: Set Up Database Schema
```bash
npx prisma generate
npx prisma db push
```

### Step 4: Restart Dev Server
```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### Step 5: Try Creating Workspace Again
Now you should be able to create a workspace!

---

## Option 2: Ask Team Member for DATABASE_URL

If you can't use Docker, ask a team member who has Supabase access to:
1. Get the DATABASE_URL from Supabase dashboard
2. Share it with you (securely)
3. Add it to your `.env.local` file

---

## Option 3: Use Existing PostgreSQL (If You Have One)

If you already have PostgreSQL running locally:

1. Update `.env.local`:
```env
DATABASE_URL="postgresql://your_user:your_password@localhost:5432/lumi_work_os?schema=public"
DIRECT_URL="postgresql://your_user:your_password@localhost:5432/lumi_work_os?schema=public"
```

2. Create the database:
```bash
createdb lumi_work_os
```

3. Set up schema:
```bash
npx prisma generate
npx prisma db push
```

---

## Verify Database Connection

After setting up, test the connection:
```bash
# If using Docker:
docker-compose exec postgres psql -U lumi_user -d lumi_work_os -c "SELECT 1;"

# Should return: 1
```

---

## Troubleshooting

**Docker not starting?**
- Make sure Docker Desktop is installed and running
- Check: `docker ps` should work without errors

**Database connection errors?**
- Make sure PostgreSQL is running
- Check the DATABASE_URL in `.env.local` matches your setup
- Restart the dev server after changing `.env.local`

**Port 5432 already in use?**
- Another PostgreSQL instance might be running
- Stop it or change the port in `docker-compose.yml`

