# Loopwell — Production Deployment Guide

This guide walks through deploying the Loopwell Next.js 15 app to Vercel with a Supabase PostgreSQL database.

---

## 1. Prerequisites

- **Node.js** 20+ (check `.nvmrc` or `package.json` engines field)
- **npm** 10+
- Accounts: [Vercel](https://vercel.com), [Supabase](https://supabase.com), [Resend](https://resend.com), [OpenAI](https://platform.openai.com), [Anthropic](https://console.anthropic.com)
- Optional: Slack app, Google Cloud project (Calendar integration), Upstash Redis

---

## 2. Supabase Production Database

### Create the project
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Choose a region close to `fra1` (e.g. **Frankfurt, EU Central**)
3. Set a strong database password — save it in your secrets manager

### Get connection strings
Navigate to **Project Settings → Database → Connection string**:
- **Transaction mode** (pooled, port 6543) → `DATABASE_URL`
- **Session mode** (direct, port 5432) → `DIRECT_URL`

Both connection strings go into Vercel environment variables (see §4).

### Run migrations
After first deploy (or locally against the production DB):
```bash
DATABASE_URL=<transaction-url> DIRECT_URL=<direct-url> npx prisma migrate deploy
```

> **Note:** `npm run build` calls `prisma generate` but does NOT run migrations automatically. Run `migrate deploy` explicitly before or after the first deploy.

---

## 3. Vercel Project Setup

### Link the repository
1. Go to [vercel.com/new](https://vercel.com/new) → **Import Git Repository**
2. Select the `lumi-work-os` repo
3. Framework preset: **Next.js** (auto-detected)
4. **Root directory:** leave as `.` (repo root)

### Set the region
In **Project Settings → Functions → Function Region**, select **Frankfurt (fra1)** to match `vercel.json`.

### Build settings
`vercel.json` at repo root handles these automatically:
- Build: `npm run build` (runs `prisma generate` + `next build`)
- Install: `npm install`
- Functions: Loopbrain routes get 60s, internal crons get 300s, all others 30s

---

## 4. Environment Variables

See `.env.production.example` at the repo root for the **complete annotated list** of every variable with descriptions and where to get each value.

Set all variables in **Vercel → Project → Settings → Environment Variables**, scoped to **Production**.

### Minimum required set (app will not start without these)
| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Pooled Supabase connection string |
| `DIRECT_URL` | Direct Supabase connection string |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://your-domain.com` |
| `NEXT_PUBLIC_APP_URL` | Same as `NEXTAUTH_URL` |
| `OPENAI_API_KEY` | For embeddings + assistant |
| `ANTHROPIC_API_KEY` | For Loopbrain reasoning |
| `RESEND_API_KEY` | For invite emails |
| `EMAIL_FROM` | Verified sender domain |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `LOOPBRAIN_CRON_SECRET` | Can match `CRON_SECRET` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `PRISMA_WORKSPACE_SCOPING_ENABLED` | Set to `true` |

---

## 5. First Deploy

### Deploy via CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

Or push to `main` branch if you set up Git integration — Vercel triggers automatically.

### Run database migrations (first time only)
```bash
# From local machine with production env vars:
DIRECT_URL=<your-direct-url> npx prisma migrate deploy
```

### Verify the build output
After deploy completes:
1. Check the Vercel build logs for any errors
2. Confirm **First Load JS** is ~104 kB (not 769 kB — that was a prior regression, now fixed)
3. Check function sizes stay within Vercel limits

---

## 6. Post-Deploy Health Checks

### Health endpoint
```
GET https://your-domain.com/api/health
```
Returns `200 OK` with:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "..."
}
```

### Smoke test checklist
- [ ] `/api/health` returns 200
- [ ] Sign-in flow works (NextAuth redirect to `/home`)
- [ ] Workspace creation / onboarding flow completes
- [ ] `/org/chart` loads without errors
- [ ] `/ask` (Loopbrain) returns a response
- [ ] Invite email sends successfully
- [ ] `/api/internal/loopbrain/run` returns 401 without `CRON_SECRET` header

### Loopbrain cron verification
Test the internal cron endpoint manually:
```bash
curl -X POST https://your-domain.com/api/internal/loopbrain/run \
  -H "Authorization: Bearer <CRON_SECRET>"
```
Expected: `200` with sync counts.

Configure Vercel Cron in `vercel.json` if you want automated nightly runs (requires Pro plan for cron jobs).

---

## 7. Custom Domain

1. Vercel → Project → **Settings → Domains → Add**
2. Enter your domain (e.g. `app.loopwell.io`)
3. Add the DNS records Vercel shows you (CNAME or A record)
4. Wait for DNS propagation (typically <5 min with Vercel)
5. Update environment variables:
   - `NEXTAUTH_URL` → `https://app.loopwell.io`
   - `NEXT_PUBLIC_APP_URL` → `https://app.loopwell.io`
   - `SLACK_REDIRECT_URI` → `https://app.loopwell.io/api/integrations/slack/callback`
6. **Redeploy** after updating env vars — NextAuth caches the URL at build time

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `PrismaClientInitializationError` | Check `DATABASE_URL` format — must use `?pgbouncer=true` for pooled connections |
| NextAuth redirect loop | Verify `NEXTAUTH_URL` exactly matches the request origin |
| `401 Unauthorized` on all API routes | `NEXTAUTH_SECRET` mismatch between deployments |
| Loopbrain returns empty / times out | Check `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` are set in Vercel Production scope |
| Emails not sending | Verify `EMAIL_FROM` domain is added and verified in Resend |
| Invite links broken | Check `NEXT_PUBLIC_APP_URL` is set — invite links use this for the base URL |
