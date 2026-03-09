# Integrations Module

> Audited 2026-03-09 from live code. 14 lib files (2,848L), 20 API routes, 5 Loopbrain context sources, 4 agent tools.

## Purpose

Third-party service integrations (Slack, Gmail, Google Drive, Google Calendar) with OAuth flows, token management, webhook processing, and Loopbrain context bridging.

## Current State

| Feature | Status | Notes |
|---------|--------|-------|
| **Slack** | | |
| OAuth connect/disconnect | **LIVE** | ADMIN+ required. Token auto-refresh with 5-min buffer. |
| Channel listing | **LIVE** | conversations.list API |
| Send messages | **LIVE** | chat.postMessage to channels/DMs. MEMBER+ role. |
| Webhook receiver | **LIVE** | HMAC-SHA256 verified + 5-min replay prevention |
| Interactive messages | **LIVE** | Button-based approval flows via LoopbrainPendingAction |
| Loopbrain bridge | **LIVE** | Slack mentions/DMs → `runLoopbrainQuery()` → reply in thread |
| Notifications | **LIVE** | Daily briefing, project alerts, meeting prep. Rate-limited: 10/hr/workspace. |
| Slack context (Loopbrain) | **LIVE** | Tier A: rolling sync (7d). Tier B: project channel enrichment. |
| Slack search (Loopbrain) | **LIVE** | On-demand keyword search across up to 10 channels, max 20 results |
| **Gmail** | | |
| OAuth connect/disconnect | **LIVE** | Per-user tokens in Integration.config.users[userId] |
| Send email | **LIVE** | Supports replies (threadId, In-Reply-To, References) |
| Fetch messages | **LIVE** | Folder filtering (inbox/sent/drafts via LABEL_MAP) |
| Archive messages | **LIVE** | Single message archive |
| Push notifications | **LIVE** | Pub/Sub watch → webhook → processGmailNotification |
| Watch renewal (cron) | **LIVE** | Daily cron renews watches expiring within 48 hours |
| Rolling sync | **LIVE** | Hourly cron: last 7 days → ContextItems. Rate-limited 1x/hr/user. |
| Gmail context (Loopbrain) | **LIVE** | Live fetch for prompts + rolling sync to ContextItems |
| Gmail search (Loopbrain) | **LIVE** | On-demand search across all of Gmail, max 10 results |
| Policy events | **LIVE** | Emits `policy.email.received` for Loopbrain policy engine |
| **Google Drive** | | |
| OAuth connect/disconnect | **LIVE** | Per-user tokens. Scopes: drive.readonly, drive.file, drive.metadata.readonly |
| File search | **LIVE** | Query builder with mimeType/folder filters. Retry with exponential backoff. |
| Read documents | **LIVE** | Google Docs → text/markdown, Sheets → CSV, PDFs, plain text. 10MB max. |
| Create documents | **LIVE** | Creates Google Docs. Write tool requires Loopbrain confirmation. |
| Update documents | **LIVE** | Append or replace modes. Write tool requires confirmation. |
| Loopbrain agent tools | **LIVE** | 4 tools: searchDriveFiles, readDriveDocument, createDriveDocument, updateDriveDocument |
| **Google Calendar** | | |
| Event fetch | **LIVE** | Via NextAuth Account tokens (not Integration model) |
| Event creation | **LIVE** | Supports attendees, location, recurrence (RRULE), timezone |
| Loopbrain tool | **LIVE** | createCalendarEvent registered in tool-registry |
| **Other IntegrationTypes** | **STUB** | Enum includes: MICROSOFT_TEAMS, ZOOM, SLITE, CLICKUP, NOTION, CONFLUENCE, ASANA — none implemented |

## Key Files

### Slack
- `src/lib/integrations/slack-service.ts` (565L) — Core: connect, send, channels, token refresh, deactivate
- `src/lib/integrations/slack/interactive.ts` (489L) — Webhook bridge: Slack events → Loopbrain → reply
- `src/lib/integrations/slack/notify.ts` (322L) — Structured notifications with Block Kit. Rate-limited.
- `src/lib/integrations/slack-interactive.ts` (269L) — Interactive messages with button tracking
- `src/lib/loopbrain/context-sources/slack.ts` (690L) — Tier A (rolling sync) + Tier B (project enrichment)
- `src/lib/loopbrain/context-sources/slack-search.ts` (245L) — On-demand keyword search

### Gmail
- `src/lib/integrations/gmail-send.ts` (132L) — MIME build + Gmail API send (supports replies)
- `src/lib/integrations/gmail/watch.ts` (193L) — Push notification watch setup + renewal
- `src/lib/integrations/gmail/notification-handler.ts` (197L) — Pub/Sub → history fetch → policy events
- `src/lib/gmail.ts` — OAuth2 client, message parser, scopes
- `src/lib/validations/gmail.ts` — GmailSendSchema (Zod)
- `src/lib/loopbrain/context-sources/gmail.ts` (631L) — Live fetch + rolling sync
- `src/lib/loopbrain/context-sources/gmail-search.ts` (166L) — On-demand search

### Google Drive
- `src/lib/integrations/drive/client.ts` (59L) — Per-user OAuth2 client builder
- `src/lib/integrations/drive/search.ts` (82L) — Query builder + Drive API search
- `src/lib/integrations/drive/read.ts` (157L) — Docs/Sheets/PDF/text export (10MB max)
- `src/lib/integrations/drive/write.ts` (129L) — Create + update Google Docs (append/replace)
- `src/lib/integrations/drive/retry.ts` (65L) — Exponential backoff (3 retries, 1s initial)
- `src/lib/integrations/drive/types.ts` (65L) — DriveFile, DriveDocumentContent, MIME constants
- `src/lib/drive.ts` — OAuth2 client factory, Drive scopes
- `src/lib/loopbrain/agent/tools/drive/` — 4 tools: search, read, create, update

### Google Calendar
- `src/lib/integrations/calendar-events.ts` (124L) — Event creation with attendees/recurrence
- `src/lib/google-calendar.ts` — Session-based OAuth via NextAuth Account model

### API Routes — 20 total

| Group | Count | Endpoints |
|-------|-------|-----------|
| Slack | 7 | `route.ts` (GET/POST/DELETE), `connect`, `callback`, `channels`, `send`, `webhook`, `test-interactive` |
| Gmail | 7 | `connect`, `callback`, `send`, `messages`, `archive`, `status`, `debug` |
| Drive | 4 | `connect`, `callback`, `status`, `disconnect` |
| Calendar | 1 | `events` (GET) |
| Webhooks | 1 | `gmail` (POST — Pub/Sub receiver) |

Plus cron/internal: `cron/renew-gmail-watches`, `internal/gmail-sync`, `internal/slack-sync`

Auth: Connect routes require ADMIN+. Send/fetch require MEMBER+. Webhooks use secret-based auth.

## Data Models

**Integration** — `id`, `workspaceId`, `type` (IntegrationType enum), `name`, `config` (Json — OAuth tokens), `isActive`, `lastSyncAt`
- @@index([workspaceId, type])

**IntegrationType enum:** SLACK, GMAIL, GOOGLE_DRIVE, MICROSOFT_TEAMS, ZOOM, SLITE, CLICKUP, NOTION, CONFLUENCE, ASANA

**LoopbrainPendingAction** — Tracks interactive Slack button actions: `type`, `contextType`, `contextId`, `contextData`, `status`, `expiration`, `createdByUserId`, `assignedToUserId`

### Token Storage Patterns

| Service | Storage | Scope |
|---------|---------|-------|
| Slack | `Integration.config.{accessToken, refreshToken, expiresAt, teamId}` | Workspace-level (bot token) |
| Gmail | `Integration.config.users[userId].{accessToken, refreshToken}` | Per-user |
| Drive | `Integration.config.users[userId].{accessToken, refreshToken}` | Per-user |
| Calendar | `NextAuth Account` model (google provider) | Per-user (session-based) |

## Loopbrain Integration — LIVE (all 4 services)

| Service | Context Source | Agent Tool | Mechanism |
|---------|---------------|------------|-----------|
| Slack | `slack.ts` (690L) — rolling sync + project enrichment | — | Tier A: 7d sync → ContextItems. Tier B: real-time channel. |
| Slack | `slack-search.ts` (245L) — on-demand search | — | Keyword search across 10 channels, max 20 results |
| Slack | `slack/interactive.ts` (489L) — Loopbrain bridge | — | Mentions/DMs → orchestrator → reply in thread |
| Gmail | `gmail.ts` (631L) — live fetch + rolling sync | `sendGmail` tool | Live threads for prompt; sync to ContextItems (24h TTL) |
| Gmail | `gmail-search.ts` (166L) — on-demand search | — | Full Gmail search, max 10 results |
| Drive | — | 4 tools: search, read, create, update | Agent tools with Zod schemas. Write requires confirmation. |
| Calendar | `calendar.ts` (969L) — events + availability | `createCalendarEvent` tool | Context source + event creation tool |

## Known Gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| 7 IntegrationTypes unimplemented | P3 | MICROSOFT_TEAMS, ZOOM, SLITE, CLICKUP, NOTION, CONFLUENCE, ASANA — enum only |
| Calendar uses different token pattern | P3 | NextAuth Account model, not Integration model. Inconsistent with Gmail/Drive. |
| No Loopbrain replyToEmail tool | P3 | sendGmail exists but no dedicated reply tool in agent registry |
| Slack search uses conversations.history | P3 | No search:read scope — client-side keyword filtering only |

No TODOs or FIXMEs found in integration code.

## Dependencies

**Foundation:** `db.ts`, `unified-auth.ts`, `assertAccess.ts`, `scopingMiddleware.ts`, `api-errors.ts`

**External APIs:** Slack Web API, Gmail API v1, Google Drive API v3, Google Calendar API v3, Google Pub/Sub

**Crypto:** `crypto.timingSafeEqual` for Slack HMAC verification

## Integration Points

| Consumer | How | What |
|----------|-----|------|
| **Loopbrain orchestrator** | Context sources + agent tools | Gmail/Slack context injection, Drive tools, Calendar tools |
| **Loopbrain policies** | `policy.email.received` event | Gmail push notifications trigger policy execution |
| **Dashboard** | Meetings card, Email widget | Calendar events + Gmail inbox for dashboard widgets |
| **Slack → Loopbrain** | Webhook → `handleSlackLoopbrainMessage()` | Slack mentions/DMs routed to Loopbrain Q&A |
| **Org notifications** | `slack/notify.ts` | Daily briefing, project alerts, meeting prep via Slack |
| **Settings page** | Slack integration section | Connect/disconnect Slack from workspace settings |
