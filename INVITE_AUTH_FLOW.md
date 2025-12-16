# Invite Authentication Flow

## Two Different Auth Paths

### Path 1: Supabase Invite (No Google OAuth Required) ✅

When a user is **invited via Supabase**:

```
1. User receives email invite
   ↓
2. User clicks invite link
   ↓
3. Supabase handles authentication (user sets password)
   ↓
4. Supabase redirects to: /auth/callback?workspace=ws-123&code=abc
   ↓
5. Callback route:
   - Exchanges Supabase code for session
   - Verifies workspace membership
   - Redirects to: /home?workspaceId=ws-123 ✅
```

**No Google OAuth needed** - Supabase handles email/password auth automatically.

### Path 2: Manual Login (Google OAuth Optional)

When a user **manually visits** `/login`:

```
1. User goes to /login
   ↓
2. User can choose:
   - Google OAuth (if configured)
   - Email/Password (if using NextAuth)
   ↓
3. After authentication → /home
```

## Environment Variable Setup

### `NEXT_PUBLIC_APP_URL`

**Should be:** `https://loopwell.io` (base URL, **NOT** `/home`)

**Why?**
- The invite redirect URL is built as: `${NEXT_PUBLIC_APP_URL}/auth/callback?workspace=...`
- If you set it to `https://loopwell.io/home`, the callback URL would be wrong
- The callback route handles redirecting to `/home` after verification

### Correct Configuration

```env
# Vercel Environment Variables
NEXT_PUBLIC_APP_URL=https://loopwell.io
```

**Not:**
```env
NEXT_PUBLIC_APP_URL=https://loopwell.io/home  # ❌ Wrong!
```

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE INVITE FLOW                      │
└─────────────────────────────────────────────────────────────┘

User receives email
    ↓
Clicks invite link
    ↓
Supabase Auth Page (sets password) ← NO Google OAuth needed
    ↓
Redirects to: https://loopwell.io/auth/callback?workspace=ws-123&code=abc
    ↓
/auth/callback route:
  ├─ Exchanges code for Supabase session
  ├─ Verifies workspace membership
  └─ Redirects to: /home?workspaceId=ws-123 ✅
    ↓
User sees dashboard (already authenticated)

┌─────────────────────────────────────────────────────────────┐
│                    MANUAL LOGIN FLOW                         │
└─────────────────────────────────────────────────────────────┘

User visits /login
    ↓
User chooses auth method:
  ├─ Google OAuth (if available)
  └─ Email/Password (NextAuth)
    ↓
After authentication → /home
```

## Key Points

1. **Supabase Invites = Email/Password Auth** (handled by Supabase)
   - User sets password when accepting invite
   - No Google OAuth required
   - Direct redirect to `/home` after verification

2. **Manual Login = User Choice**
   - Can use Google OAuth (if configured)
   - Can use Email/Password (NextAuth)
   - Both lead to `/home` after auth

3. **NEXT_PUBLIC_APP_URL = Base Domain**
   - Set to: `https://loopwell.io`
   - **NOT** `https://loopwell.io/home`
   - The callback route handles the `/home` redirect

## Testing the Flow

1. **Invite a user** → They receive email
2. **User clicks invite** → Supabase auth page (set password)
3. **After setting password** → Redirected to `/auth/callback`
4. **Callback verifies** → Redirects to `/home?workspaceId=...`
5. **User sees dashboard** ✅

**No Google OAuth step needed for invites!**




