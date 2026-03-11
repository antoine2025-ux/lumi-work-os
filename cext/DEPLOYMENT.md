# DEPLOYMENT.md — Loopwell Operational Documentation

> **Complete guide for deploying, configuring, and operating Loopwell in production.**
> Last updated: March 11, 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Environment Variables](#2-environment-variables)
3. [Deployment Steps](#3-deployment-steps)
4. [Local Development Setup](#4-local-development-setup)
5. [Database Operations](#5-database-operations)
6. [Monitoring & Debugging](#6-monitoring--debugging)
7. [Known Operational Notes](#7-known-operational-notes)

---

## 1. Architecture Overview

Loopwell is a distributed system with the following components:

### Core Services

| Service | Platform | Purpose | Port/URL |
|---------|----------|---------|----------|
| **Main App** | Vercel | Next.js 15 application (App Router) | Port 3000 (dev) |
| **Collab Server** | Railway | Hocuspocus real-time collaboration (Yjs) | Port 1234 |
| **Database** | Supabase | PostgreSQL 15 with pgvector extension | Port 5432 |

### External APIs

| Service | Purpose | Required |
|---------|---------|----------|
| **Anthropic** | Loopbrain LLM (Claude Sonnet 4.6) | Yes (or OpenAI) |
| **OpenAI** | Embeddings (text-embedding-3-small) | Yes (or Anthropic) |
| **Google OAuth** | User authentication | Yes |
| **Google Calendar** | Calendar integration | Optional |
| **Google Gmail** | Email integration | Optional |
| **Google Drive** | Document integration | Optional |
| **Slack** | Team messaging integration | Optional |
| **Resend** | Transactional email | Optional |

### Data Flow

```
User Browser
    ↓
Vercel (Next.js)
    ↓
├─→ Supabase PostgreSQL (via connection pooler)
├─→ Railway Hocuspocus (WebSocket for real-time collab)
├─→ Anthropic API (Loopbrain queries)
├─→ OpenAI API (embeddings)
└─→ Google APIs (OAuth, Calendar, Gmail, Drive)
```

---

## 2. Environment Variables

### Database

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string (pooled) | `postgresql://user:pass@db.supabase.co:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | **Yes** | Direct PostgreSQL connection (for migrations) | `postgresql://user:pass@db.supabase.co:5432/postgres` |
| `PRISMA_WORKSPACE_SCOPING_ENABLED` | No | Enable workspace scoping middleware (default: `true`) | `true` or `false` |

**Notes:**
- `DATABASE_URL` must include `?pgbouncer=true&prepared_statements=false&sslmode=require` for Supabase pooler
- `DIRECT_URL` is used only by `prisma migrate deploy` (bypasses pooler)
- Supabase provides both URLs in the dashboard (Settings → Database → Connection string)

### Authentication

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXTAUTH_SECRET` | **Yes** | JWT signing secret (min 32 chars) | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | **Yes** | Full app URL for OAuth callbacks | `https://app.loopwell.com` |
| `NEXT_PUBLIC_APP_URL` | No | Public-facing app URL (client-side) | `https://app.loopwell.com` |
| `APP_URL` | No | Alternative app URL (server-side) | `https://app.loopwell.com` |

**Notes:**
- `NEXTAUTH_SECRET` must be at least 32 characters
- In development, `NEXTAUTH_URL` defaults to `http://localhost:3000`
- Production requires explicit `NEXTAUTH_URL` set

### AI Providers (at least one required)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | **Yes*** | Anthropic API key for Claude | `sk-ant-api03-...` |
| `OPENAI_API_KEY` | **Yes*** | OpenAI API key for embeddings | `sk-proj-...` |
| `GOOGLE_API_KEY` | No | Google AI API key (alternative) | `AIza...` |

**Notes:**
- *At least one of `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` is required
- Loopbrain uses Anthropic for LLM (Claude Sonnet 4.6) and OpenAI for embeddings
- If only one provider is set, the app will use it for both LLM and embeddings

### Loopbrain Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `LOOPBRAIN_MODEL` | No | Default LLM model | `claude-sonnet-4-6` |
| `LOOPBRAIN_ORG_MODEL` | No | Org-specific LLM model | `claude-sonnet-4-6` |
| `LOOPBRAIN_ORG_MAX_TOKENS` | No | Max tokens for org queries | `16000` |
| `LOOPBRAIN_ORG_TIMEOUT_MS` | No | Timeout for org queries (ms) | `60000` |
| `LOOPBRAIN_ORG_ENABLED` | No | Enable org context features | `true` |

### Google OAuth & Integrations

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | **Yes** | Google OAuth client ID | `123456789.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | **Yes** | Google OAuth client secret | `GOCSPX-...` |
| `GOOGLE_CLOUD_PROJECT_ID` | No | GCP project ID (for Gmail Pub/Sub) | `loopwell-prod` |
| `GOOGLE_PUBSUB_TOPIC_NAME` | No | Pub/Sub topic for Gmail webhooks | `gmail-notifications` |

**Notes:**
- Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- Authorized redirect URIs: `https://app.loopwell.com/api/auth/callback/google`
- Scopes required: `openid`, `email`, `profile`, `calendar.events`
- Gmail integration requires Pub/Sub topic setup (see Google Cloud docs)

### Slack Integration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SLACK_CLIENT_ID` | No | Slack OAuth client ID | `123456789.123456789` |
| `SLACK_CLIENT_SECRET` | No | Slack OAuth client secret | `abc123...` |
| `SLACK_SIGNING_SECRET` | No | Slack webhook signature verification | `abc123...` |
| `SLACK_REDIRECT_URI` | No | OAuth redirect URI | `https://app.loopwell.com/api/integrations/slack/callback` |

**Notes:**
- Create Slack app at [api.slack.com/apps](https://api.slack.com/apps)
- Required scopes: `chat:write`, `channels:read`, `users:read`, `users:read.email`

### Email (Resend)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `RESEND_API_KEY` | No | Resend API key for transactional email | `re_...` |
| `EMAIL_FROM` | No | Sender email address | `Loopwell <noreply@loopwell.com>` |
| `MAIL_FROM` | No | Alternative sender email (fallback) | `noreply@loopwell.com` |

**Notes:**
- Without `RESEND_API_KEY`, emails are logged to console only (dev mode)
- Default sender: `Loopwell <onboarding@resend.dev>` (Resend test domain)
- Production requires verified domain in Resend dashboard

### Real-Time Collaboration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `COLLAB_URL` | No | Hocuspocus server URL (server-side) | `ws://localhost:1234` |
| `NEXT_PUBLIC_COLLAB_URL` | No | Hocuspocus server URL (client-side) | `wss://collab.loopwell.com` |

**Notes:**
- Development defaults to `ws://localhost:1234`
- Production requires Railway deployment with WebSocket support
- Railway provides public URL (e.g., `wss://loopwell-collab.up.railway.app`)

### Cron & Internal Secrets

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `CRON_SECRET` | No | Secret for cron job authentication | `openssl rand -hex 32` |
| `LOOPBRAIN_CRON_SECRET` | No | Secret for Loopbrain cron jobs | `openssl rand -hex 32` |

**Notes:**
- Required in production for `/api/cron/*` endpoints
- Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` header
- If unset in production, cron endpoints return 403

### Feature Flags

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_ENABLE_ASSISTANT` | No | Enable AI assistant UI | `true` |
| `NEXT_PUBLIC_ENABLE_SOCKET_IO` | No | Enable Socket.io real-time features | `true` |
| `ORG_CONTEXT_NIGHTLY_ENABLED` | No | Enable nightly org context refresh | `true` |
| `ORG_CONTEXT_NIGHTLY_CRON` | No | Cron schedule for org context | `0 2 * * *` |
| `API_VERBOSE_LOGGING` | No | Enable verbose API logging | `true` |

### Supabase (optional, if using Supabase client)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anonymous key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role key | `eyJ...` |

**Notes:**
- Only required if using Supabase client SDK (not needed for direct Prisma connection)

### Redis (optional)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `REDIS_URL` | No | Redis connection string | `redis://default:pass@redis.upstash.io:6379` |

**Notes:**
- App degrades gracefully without Redis (in-memory fallback)
- Used for rate limiting and caching

### Sentry (optional)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN for error tracking | `https://abc123@o123.ingest.sentry.io/456` |
| `SENTRY_ORG` | No | Sentry organization slug | `loopwell` |
| `SENTRY_PROJECT` | No | Sentry project slug | `loopwell-app` |
| `SENTRY_AUTH_TOKEN` | No | Sentry auth token (build-time only) | `sntrys_...` |

**Notes:**
- `NEXT_PUBLIC_SENTRY_DSN` is public (included in browser bundle)
- `SENTRY_AUTH_TOKEN` is used only at build time for source map uploads

### Testing (development only)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `E2E_TEST_AUTH` | No | Enable E2E test auth (dev only) | `true` |
| `E2E_TEST_PASSWORD` | No | Password for E2E test user | `test123` |

**Notes:**
- Never set in production (security risk)
- Used by Playwright E2E tests

### Vercel (auto-injected)

| Variable | Description |
|----------|-------------|
| `VERCEL_URL` | Auto-injected by Vercel (deployment URL) |
| `NODE_ENV` | Auto-set to `production` in Vercel |
| `NEXT_PHASE` | Auto-set during build (`phase-production-build`) |

---

## 3. Deployment Steps

### Vercel (Main App)

1. **Connect GitHub Repository**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import GitHub repository: `your-org/lumi-work-os`
   - Select framework: **Next.js**

2. **Configure Build Settings**
   - Build command: `npm run build`
   - Output directory: `.next` (default)
   - Install command: `npm install`
   - Node.js version: **20.x** (or latest LTS)

3. **Set Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all required variables from [Section 2](#2-environment-variables)
   - Set `NODE_OPTIONS="--max-old-space-size=8192"` (required for large codebase)

4. **Deploy**
   - Click **Deploy**
   - First deployment takes ~5-10 minutes
   - Subsequent deployments take ~2-3 minutes

5. **Post-Deployment**
   - Run database migrations (see [Section 5](#5-database-operations))
   - Verify deployment at `https://your-app.vercel.app`

### Railway (Collab Server)

1. **Create New Project**
   - Go to [railway.app](https://railway.app)
   - Click **New Project** → **Deploy from GitHub repo**
   - Select repository: `your-org/lumi-work-os`

2. **Configure Service**
   - Service name: `loopwell-collab`
   - Root directory: `/` (Railway will use `scripts/start-collab-server.ts`)
   - Start command: `tsx scripts/start-collab-server.ts`
   - Port: `1234`

3. **Set Environment Variables**
   - `DATABASE_URL` — same as Vercel (pooled URL)
   - `NEXTAUTH_SECRET` — same as Vercel (for JWT verification)
   - `NODE_ENV` — `production`

4. **Deploy**
   - Railway auto-deploys on push to main
   - Get public URL: `Settings → Networking → Public URL`
   - Example: `loopwell-collab.up.railway.app`

5. **Update Vercel Environment Variables**
   - Set `NEXT_PUBLIC_COLLAB_URL=wss://loopwell-collab.up.railway.app`
   - Redeploy Vercel app

### Supabase (Database)

1. **Create Project**
   - Go to [supabase.com/dashboard](https://supabase.com/dashboard)
   - Click **New Project**
   - Select region (closest to Vercel deployment)
   - Choose plan: **Pro** (required for pgvector)

2. **Enable pgvector Extension**
   - Go to **Database → Extensions**
   - Enable `vector` extension

3. **Get Connection Strings**
   - Go to **Settings → Database → Connection string**
   - Copy **Connection pooling** URL (port 6543) → `DATABASE_URL`
   - Copy **Direct connection** URL (port 5432) → `DIRECT_URL`

4. **Run Migrations**
   - See [Section 5](#5-database-operations)

5. **Configure Connection Pooling**
   - Pooler mode: **Transaction** (default)
   - Pool size: **15** (default)
   - Max client connections: **100** (default)

---

## 4. Local Development Setup

### Prerequisites

- Node.js 20.x or later
- npm 10.x or later
- PostgreSQL 15 (local or Supabase)

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/lumi-work-os.git
cd lumi-work-os

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values (see Section 2)

# 4. Run database migrations
npx prisma migrate dev

# 5. Generate Prisma client
npx prisma generate

# 6. (Optional) Seed database with mock data
npm run db:seed:acme
```

### Development Servers

```bash
# Option 1: Next.js only (no real-time collab)
npm run dev

# Option 2: Next.js + Hocuspocus collab server (recommended)
# Terminal 1:
npm run dev

# Terminal 2:
npm run dev:collab
```

### Development URLs

- **Next.js app:** http://localhost:3000
- **Hocuspocus collab:** ws://localhost:1234
- **Prisma Studio:** `npx prisma studio` (http://localhost:5555)

### Hot Reload Notes

- Next.js hot reloads automatically
- After `prisma generate`, restart the dev server to pick up schema changes
- Hocuspocus server requires manual restart after code changes

### Running Tests

#### Unit Tests (Vitest)

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

#### E2E Tests (Playwright)

**Setup (Local Development):**

1. Start the dev server: `npm run dev`
2. Generate auth state (one-time):
   ```bash
   npx playwright codegen --save-storage=.auth/user.json http://localhost:3000/login
   ```
3. Complete Google OAuth login in the browser
4. Close the browser when done

**Running E2E Tests:**

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/wiki-crud.spec.ts

# Run with UI (debug mode)
npm run test:e2e:ui

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific test by name
npx playwright test -g "Create: POST /api/wiki/pages"
```

**5 Critical Flow Tests:**

1. **Onboarding Flow** (`onboarding-flow.spec.ts`) — New workspace wizard
2. **Wiki CRUD** (`wiki-crud.spec.ts`) — Complete wiki page lifecycle
3. **Task CRUD** (`tasks-crud.spec.ts`) — Complete task lifecycle
4. **Loopbrain Chat** (`loopbrain-chat.spec.ts`) — AI Q&A system
5. **Workspace Isolation** (`workspace-isolation.spec.ts`) — Multi-tenant data isolation

See `tests/e2e/README.md` for comprehensive E2E test documentation.

**CI Environment:**

E2E tests in CI use automated authentication:
- Set `E2E_AUTH_ENABLED=true`
- Set `E2E_AUTH_SECRET` environment variable
- Tests use `/api/e2e-auth` endpoint to create test sessions

#### Type Checking

```bash
# Run TypeScript type checker
npm run typecheck
```

#### Linting

```bash
# Run ESLint
npm run lint
```

#### Quality Gates

```bash
# Run E2E tests + security checks
npm run quality:gate

# Run full suite (typecheck + lint + unit + E2E + security)
npm run quality:gate:strict
```

---

## 5. Database Operations

### Running Migrations (Production)

```bash
# Deploy pending migrations (uses DIRECT_URL)
npx prisma migrate deploy
```

**Notes:**
- Always run migrations **before** deploying app code
- Migrations run against `DIRECT_URL` (bypasses pooler)
- Vercel deployment does NOT auto-run migrations
- Recommended: Run migrations manually or via CI/CD

### Running Migrations (Development)

```bash
# Create and apply migration
npx prisma migrate dev --name <description>

# Example:
npx prisma migrate dev --name add_user_preferences
```

**Notes:**
- Creates migration file in `prisma/migrations/`
- Applies migration to local database
- Generates Prisma client
- **Never use `prisma db push` in development** (see `.cursorrules` §12)

### Resetting Local Database

```bash
# WARNING: Deletes all data
npx prisma migrate reset

# Runs:
# 1. Drop database
# 2. Create database
# 3. Apply all migrations
# 4. Run seed script
```

### Seeding Mock Data

```bash
# Seed Acme Analytics workspace (full demo data)
npm run db:seed:acme

# Seed fresh Acme workspace (deletes existing)
npm run db:seed:acme:fresh

# Seed Loopwell workspace (alternative demo)
npm run db:seed:loopwell

# Seed org structure only
npm run db:seed:org
```

### Connection Pooling (Supabase)

**Pooled connection (`DATABASE_URL`):**
- Uses PgBouncer in **transaction mode**
- Port: 6543
- Required params: `?pgbouncer=true&prepared_statements=false&sslmode=require`
- Used by: Next.js app (all runtime queries)

**Direct connection (`DIRECT_URL`):**
- Bypasses pooler
- Port: 5432
- Used by: Prisma migrations only

**Why both?**
- PgBouncer transaction mode doesn't support prepared statements
- Migrations require prepared statements
- Solution: Use pooler for app, direct for migrations

### Prisma Studio (Database GUI)

```bash
# Open Prisma Studio
npx prisma studio

# Access at http://localhost:5555
```

---

## 6. Monitoring & Debugging

### Current State

- **Error monitoring:** Sentry (requires `NEXT_PUBLIC_SENTRY_DSN`)
  - Captures 500-level API errors automatically
  - Captures Loopbrain LLM and tool execution failures
  - Captures client-side crashes via global error boundary
  - 10% transaction sampling for performance monitoring
- **Logging:** Console logs to stdout (Vercel Function Logs)
- **Metrics:** None (no APM beyond Sentry performance monitoring)

### Vercel Function Logs

- Go to **Vercel Dashboard → Project → Logs**
- Filter by function: `/api/*`
- Filter by status code: `4xx`, `5xx`
- Real-time logs available for 24 hours
- Historical logs available on Pro plan

### Railway Logs

- Go to **Railway Dashboard → Project → loopwell-collab → Logs**
- Real-time logs for Hocuspocus server
- Look for `[Hocuspocus]` prefixed logs

### Debugging Workspace Scoping

If you suspect workspace isolation issues:

```bash
# Disable workspace scoping middleware
PRISMA_WORKSPACE_SCOPING_ENABLED=false npm run dev
```

**Notes:**
- Scoping is enabled by default (`true`)
- Disabling removes automatic workspace filtering (routes must still use explicit `where: { workspaceId }`)
- Only use for debugging — never disable in production

### Development Routes (NODE_ENV=development only)

- `/api/dev/*` — Development-only routes
- Automatically disabled in production
- Used for testing and debugging

### Common Issues

**Issue:** `Engine is not yet connected` error
- **Cause:** Prisma client not initialized
- **Fix:** Restart dev server after `prisma generate`

**Issue:** `P2025: Record not found`
- **Cause:** Workspace scoping middleware filtered the record
- **Fix:** Verify `setWorkspaceContext(workspaceId)` is called before query

**Issue:** Build fails with "JavaScript heap out of memory"
- **Cause:** Large codebase (1,877 TS/TSX files)
- **Fix:** Set `NODE_OPTIONS="--max-old-space-size=8192"` in Vercel environment variables

**Issue:** Google OAuth "redirect_uri_mismatch"
- **Cause:** OAuth redirect URI not configured in Google Cloud Console
- **Fix:** Add `https://your-app.vercel.app/api/auth/callback/google` to authorized redirect URIs

---

## 7. Known Operational Notes

### Build Requirements

- **Heap size:** Requires `NODE_OPTIONS="--max-old-space-size=8192"` (8GB heap)
- **Build time:** ~5-10 minutes (first build), ~2-3 minutes (subsequent)
- **Build command:** `npm run build` (runs `prisma generate` first)

### Google OAuth Refresh Tokens

- Google only sends `refresh_token` on **first authorization**
- Subsequent sign-ins return `access_token` only
- To get new refresh token: revoke app access in Google Account settings, re-authorize
- See `src/server/authOptions.ts:290-296` for handling logic

### Dependency Audit

```bash
# Check for vulnerabilities
npm audit

# Current state (as of March 2026):
# - 14 low/moderate CVEs in dev dependencies
# - 0 high/critical CVEs in production dependencies
# - Documented in TECH_DEBT.md P1
```

**Notes:**
- Dev dependency CVEs do not affect production
- Run `npm audit fix` to auto-fix compatible updates
- Some CVEs require major version upgrades (breaking changes)

### Database Schema

- **Models:** 168 Prisma models
- **API routes:** ~494 routes
- **Workspace-scoped models:** 152 models (see `src/lib/prisma/scopingMiddleware.ts`)

### Test Suite

```bash
# Unit tests (Vitest)
npm run test

# E2E tests (Playwright)
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint

# Full quality gate
npm run quality:gate:strict
```

**Current test coverage:**
- Unit tests: 66 test files
- E2E tests: Minimal coverage (tracked in `TECH_DEBT.md` P2)
- Type safety: 0 TypeScript errors (`tsc --noEmit` passes clean)

### Performance

- **Load testing:** Not done (tracked in `TECH_DEBT.md` P1)
- **Baseline:** Unknown concurrent user capacity
- **Recommendation:** Run k6 or Artillery against staging before launch

### Security

- **Auth:** NextAuth.js 4 (JWT sessions)
- **RBAC:** Role-based access control (VIEWER < MEMBER < ADMIN < OWNER)
- **Workspace isolation:** Automatic via Prisma middleware (default ON)
- **SQL injection:** All queries parameterized (0 string interpolation)
- **CSRF:** Next.js CSRF protection enabled
- **Rate limiting:** Not implemented (tracked in `TECH_DEBT.md` P2)

### Backup & Recovery

- **Database backups:** Supabase automatic daily backups (7-day retention on Pro plan)
- **Point-in-time recovery:** Available on Supabase Pro plan
- **Manual backups:** `pg_dump` via `DIRECT_URL`

```bash
# Manual backup
pg_dump $DIRECT_URL > backup.sql

# Restore
psql $DIRECT_URL < backup.sql
```

---

## Appendix: Quick Reference

### Essential Commands

```bash
# Development
npm run dev                    # Next.js dev server
npm run dev:collab            # Hocuspocus collab server

# Build
npm run build                 # Production build

# Database
npx prisma migrate deploy     # Run migrations (production)
npx prisma migrate dev        # Create migration (development)
npx prisma studio             # Database GUI

# Testing
npm run test                  # Unit tests
npm run test:e2e             # E2E tests
npm run typecheck            # Type checking
npm run lint                 # Linting

# Quality gates
npm run quality:gate         # E2E + security
npm run quality:gate:strict  # Full suite
```

### Support Contacts

- **Technical lead:** Tony (tony@loopwell.com)
- **Infrastructure:** Vercel, Railway, Supabase dashboards
- **Documentation:** `cext/ARCHITECTURE.md`, `cext/TECH_DEBT.md`, `CLAUDE.md`

---

*Last updated: March 11, 2026*
*Update this file when infrastructure changes.*
