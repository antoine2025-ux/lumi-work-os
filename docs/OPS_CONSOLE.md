# Ops Console

## Overview

The Ops Console is an internal-only, read-only monitoring dashboard for observing real product behavior (performance + errors) without bloating the product. It's designed for MVP debugging and is accessible only to workspace owners/admins or explicitly allowed emails.

**Location**: `/ops`

## What It Is

The Ops Console provides:
- **Performance metrics**: Request timing data for key API endpoints
- **Error tracking**: Client-side error reports from browsers
- **Real-time monitoring**: Recent request data for debugging

It is **NOT** a product feature - it's a founder-only backoffice tool for debugging and monitoring.

## Setup

### Enable Logging

Set the following environment variable to enable ops event logging:

```bash
OPS_LOGGING_ENABLED=true
```

**Important**: When `OPS_LOGGING_ENABLED` is `false` or unset, no events are logged and the system has zero overhead.

### Configure Access

By default, only workspace owners and admins can access `/ops`. To allow additional emails, set:

```bash
OPS_ALLOWED_EMAILS=founder@example.com,admin@example.com
```

Comma-separated list of email addresses that should have access.

## What It Logs

### Request Timing Events

Logged automatically for:
- `/api/dashboard/bootstrap`
- `/api/projects` (GET)
- `/api/todos` (GET)

Each event includes:
- `route`: API route path
- `method`: HTTP method (GET, POST, etc.)
- `status`: HTTP status code
- `durationMs`: Total request duration
- `authDurationMs`: Authentication time
- `dbDurationMs`: Database query time
- `workspaceId`: Workspace ID (for correlation)
- `userId`: User ID (for correlation only, not displayed in UI)

### Client Error Events

Logged from browser error handlers:
- `route`: Page route where error occurred
- `message`: Error message (truncated to 1000 chars)
- `stack`: Stack trace (truncated to 2000 chars, sampled 1 in 5)
- `userAgent`: Browser user agent (truncated to 500 chars)

## What It Does NOT Log

The Ops Console explicitly does **NOT** store:
- ❌ Email addresses (except for access control)
- ❌ User names
- ❌ Tokens or credentials
- ❌ Page content/body/HTML
- ❌ Request/response bodies
- ❌ Any PII (Personally Identifiable Information)

The `userId` field is stored for correlation purposes only and is **never displayed in the UI**.

## Using the Ops Console

### Access

1. Navigate to `/ops` in your browser
2. You must be:
   - A workspace owner or admin, OR
   - Your email must be in `OPS_ALLOWED_EMAILS`
3. If unauthorized, you'll see a 404 (not "access denied")

### Dashboard Sections

#### 1. Bootstrap Performance (Last 1 Hour)

Shows performance metrics for `/api/dashboard/bootstrap`:
- **P50**: Median response time
- **P95**: 95th percentile response time
- **Count**: Number of requests in the time window

#### 2. Slowest Endpoints (Last 1 Hour)

Shows the slowest API endpoints grouped by route:
- **Route**: API endpoint path
- **Avg (ms)**: Average response time
- **P95 (ms)**: 95th percentile response time
- **Count**: Number of requests

#### 3. Recent Client Errors (Last 24 Hours)

Shows client-side errors reported from browsers:
- **Time**: When the error occurred
- **Route**: Page route where error happened
- **Message**: Error message (truncated to 100 chars)

#### 4. Recent Requests (Last 15 Minutes)

Shows the most recent API requests:
- **Time**: Request timestamp
- **Route**: API endpoint
- **Method**: HTTP method
- **Status**: HTTP status code
- **Duration (ms)**: Request duration

## Debugging Workflow

### Investigating Slow Performance

1. Check **Bootstrap Performance** for overall dashboard load time
2. Review **Slowest Endpoints** to identify bottlenecks
3. Look at **Recent Requests** to see real-time performance

### Investigating Errors

1. Check **Recent Client Errors** for browser-reported issues
2. Filter by route to see if errors are page-specific
3. Review error messages (truncated) for patterns

### Performance Regression

1. Compare P50/P95 values over time (manual comparison)
2. Identify which endpoints are slowest
3. Check if slow requests correlate with specific routes or times

## Technical Details

### Data Storage

- **Table**: `ops_events` (PostgreSQL)
- **Indexes**: 
  - `createdAt` (for time-based queries)
  - `kind, createdAt` (for filtering by event type)
  - `route, createdAt` (for route-specific queries)

### Query Limits

- Maximum 200 rows per query
- Time windows: 1 hour, 24 hours, 15 minutes
- Data is not automatically purged (manual cleanup may be needed)

### Non-Blocking Logging

All logging is fire-and-forget:
- Uses `void prisma.opsEvent.create(...)` 
- Errors are silently caught
- Never blocks request processing
- Zero performance impact when disabled

### Client Error Sampling

Client errors are sampled at 1 in 5 (20%) to avoid spam:
- Reduces database writes
- Still captures error patterns
- Prevents overwhelming the system

## Security

- **Access Control**: Workspace owners/admins or explicit email allowlist
- **No PII**: No personal information is stored or displayed
- **404 on Unauthorized**: Returns 404 (not "access denied") for security
- **Read-Only**: No write operations from the console
- **Internal Only**: Not exposed to end users

## Troubleshooting

### No Data Showing

1. Check `OPS_LOGGING_ENABLED=true` is set
2. Verify events are being created (check database)
3. Ensure time windows include recent data

### Can't Access /ops

1. Verify you're a workspace owner/admin
2. Check `OPS_ALLOWED_EMAILS` includes your email
3. Ensure you're authenticated

### Performance Impact

- When `OPS_LOGGING_ENABLED=false`, there is zero overhead
- When enabled, logging is non-blocking (fire-and-forget)
- Database writes are async and won't slow requests

## Future Enhancements (Not in Scope)

The following are explicitly **NOT** included in this MVP:
- Charts or graphs
- Historical trend analysis
- Alerting/notifications
- Data export
- Custom time ranges
- Filtering/search
- Real-time updates (page refresh required)

Keep the scope tight - this is for MVP debugging, not a full monitoring solution.

