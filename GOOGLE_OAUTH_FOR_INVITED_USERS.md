# Google OAuth for Invited Users

## ✅ Yes, Invited Users CAN Login with Google OAuth

### How It Works

The system uses **email as the unique identifier** for users, which allows seamless switching between auth methods:

1. **User is invited via Supabase** → User record created with email
2. **User later logs in with Google OAuth** → Same email → Finds existing user
3. **User account is updated** → Name, image, etc. synced from Google

### Technical Details

From `src/lib/auth.ts`:

```typescript
async signIn({ user, account, profile }) {
  if (account?.provider === 'google') {
    const dbUser = await prisma.user.upsert({
      where: { email: user.email! },  // ← Matches by email
      update: {
        name: user.name,
        image: user.image,
        emailVerified: new Date(),
      },
      create: {
        email: user.email!,
        name: user.name || 'User',
        image: user.image,
        emailVerified: new Date(),
      }
    })
  }
}
```

**Key Point:** `upsert` with `where: { email }` means:
- If user exists (invited via email) → **Updates** their record
- If user doesn't exist → **Creates** new user
- **Same email = Same user** ✅

### User Flow Examples

#### Scenario 1: Invited User Logs In with Google

```
1. Admin invites user@example.com via Supabase
   ↓
2. User record created: { email: "user@example.com", name: "user" }
   ↓
3. User clicks invite link → Sets password → Accesses dashboard
   ↓
4. Later, user visits /login → Clicks "Continue with Google"
   ↓
5. Google OAuth → Finds existing user by email
   ↓
6. Updates user record: { email: "user@example.com", name: "John Doe", image: "..." }
   ↓
7. User logs in successfully ✅
```

#### Scenario 2: User Logs In with Google First, Then Gets Invited

```
1. User visits /login → Clicks "Continue with Google"
   ↓
2. User record created: { email: "user@example.com", name: "John Doe" }
   ↓
3. Later, admin invites user@example.com
   ↓
4. Invite creates WorkspaceMember record
   ↓
5. User can access workspace ✅
```

### Current Setup

✅ **Google OAuth is already configured** (if credentials are set)
- Checked in `src/lib/auth.ts` - only enabled if `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured
- Login page shows Google button if provider is available
- Uses `upsert` to match users by email

### Requirements

For Google OAuth to work:

1. **Set environment variables:**
   ```env
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

2. **Configure Google OAuth in Google Cloud Console:**
   - Authorized redirect URIs: `https://loopwell.io/api/auth/callback/google`
   - Authorized JavaScript origins: `https://loopwell.io`

3. **That's it!** The system automatically handles:
   - Matching users by email
   - Updating user records
   - Preserving workspace memberships

### Benefits

✅ **Flexible Authentication**
- Users can choose their preferred login method
- Email/password (Supabase) OR Google OAuth
- Both methods work seamlessly together

✅ **Account Linking**
- Same email = Same account
- No duplicate accounts
- Workspace memberships preserved

✅ **User Experience**
- Invited users can use Google OAuth for faster login
- No need to remember password if they prefer Google
- Profile info (name, image) synced from Google

### Testing

To verify it works:

1. **Invite a user** via Supabase invite
2. **User accepts invite** → Sets password → Accesses dashboard
3. **User logs out**
4. **User visits `/login`** → Clicks "Continue with Google"
5. **Should login successfully** → Same account → Same workspace access ✅

### Summary

**Yes, invited users CAN login with Google OAuth!**

- ✅ Email-based matching ensures same account
- ✅ `upsert` handles both create and update cases
- ✅ Workspace memberships are preserved
- ✅ No additional configuration needed (if Google OAuth is already set up)

The system is designed to support **multiple auth methods** for the same user account, identified by email address.




