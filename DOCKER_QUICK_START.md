# Docker Quick Start Guide

## Where to Run Commands

You need to run commands in a **Terminal** (command line). Here's how:

### On Mac:
1. **Open Terminal:**
   - Press `Cmd + Space` (Command + Spacebar)
   - Type "Terminal"
   - Press Enter
   - OR right-click the folder in Finder → "New Terminal at Folder"

2. **Navigate to Project:**
   ```bash
   cd "/Users/alekseis./Loopwell HR/lumi-work-os"
   ```
   (Or just open Terminal from the project folder)

---

## Step-by-Step: Start Database

### Step 1: Open Terminal
- Open Terminal app (see above)

### Step 2: Go to Project Folder
In Terminal, type:
```bash
cd "/Users/alekseis./Loopwell HR/lumi-work-os"
```
Press Enter

### Step 3: Start Database
Type this command:
```bash
docker-compose up -d
```
Press Enter

**What this does:**
- `docker-compose` = Docker tool for managing multiple containers
- `up` = Start containers
- `-d` = Run in background (detached mode)

**Expected output:**
```
Creating network "lumi-work-os_lumi-network" ... done
Creating lumi-postgres ... done
Creating lumi-pgadmin ... done
```

### Step 4: Verify It's Running
Type:
```bash
docker-compose ps
```
Press Enter

**You should see:**
```
NAME            STATUS          PORTS
lumi-postgres   Up X seconds     0.0.0.0:5432->5432/tcp
lumi-pgadmin    Up X seconds     0.0.0.0:5050->80/tcp
```

### Step 5: Set Up Database Schema
Type:
```bash
npx prisma generate
```
Press Enter, wait for it to finish

Then:
```bash
npx prisma db push
```
Press Enter, wait for it to finish

### Step 6: Restart Dev Server
1. Find the terminal where `npm run dev` is running
2. Press `Ctrl + C` to stop it
3. Type: `npm run dev`
4. Press Enter

### Step 7: Try Creating Workspace
Go back to your browser and try creating the workspace again!

---

## Visual Guide

```
Terminal Window
├─ Command Prompt: $
├─ Type: docker-compose up -d
├─ Press: Enter
└─ See: Containers starting...
```

---

## Troubleshooting

**"command not found: docker-compose"**
- Try: `docker compose up -d` (no hyphen, newer Docker versions)

**"Cannot connect to Docker daemon"**
- Make sure Docker Desktop is running (green icon in menu bar)

**"Port 5432 already in use"**
- Another PostgreSQL might be running
- Stop it or change port in docker-compose.yml

**Want to see logs?**
```bash
docker-compose logs postgres
```

**Want to stop database?**
```bash
docker-compose down
```

**Want to restart database?**
```bash
docker-compose restart
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Start database | `docker-compose up -d` |
| Check status | `docker-compose ps` |
| View logs | `docker-compose logs postgres` |
| Stop database | `docker-compose down` |
| Restart database | `docker-compose restart` |

