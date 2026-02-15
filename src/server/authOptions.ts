import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma, prismaUnscoped } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ensureOrgPositionForUser } from "@/lib/org/ensure-org-position";

// E2E Test Auth: Only enabled when E2E_TEST_AUTH=true AND not in production
const isE2ETestAuthEnabled = 
  process.env.E2E_TEST_AUTH === 'true' && 
  process.env.NODE_ENV !== 'production';

// Check if we have Google OAuth credentials
const hasGoogleCredentials = process.env.GOOGLE_CLIENT_ID && 
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CLIENT_ID !== "REPLACE_WITH_GOOGLE_CLIENT_ID" &&
  process.env.GOOGLE_CLIENT_SECRET !== "REPLACE_WITH_GOOGLE_CLIENT_SECRET";

// Validate required NextAuth environment variables
if (!process.env.NEXTAUTH_SECRET) {
  console.warn('⚠️ NEXTAUTH_SECRET is not set. Authentication may not work correctly.');
}

if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ NEXTAUTH_URL is not set in production. Authentication may not work correctly.');
}

// Determine the correct base URL for NextAuth
// In development: always use localhost unless NEXTAUTH_URL is explicitly set to localhost
// In production: NEXTAUTH_URL > VERCEL_URL > default
const getBaseUrl = () => {
  // In development, always use localhost unless NEXTAUTH_URL is explicitly set to localhost
  if (process.env.NODE_ENV === 'development') {
    // If NEXTAUTH_URL is set and points to localhost, use it (allows custom ports)
    if (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.includes('localhost')) {
      return process.env.NEXTAUTH_URL;
    }
    // Otherwise, always default to localhost:3000 in development
    return 'http://localhost:3000';
  }
  
  // In production, use NEXTAUTH_URL or VERCEL_URL
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Fallback (shouldn't happen in production)
  return 'http://localhost:3000';
};

const baseUrl = getBaseUrl();
console.log('🔐 [NextAuth] Base URL for callbacks:', baseUrl);
console.log('🔐 [NextAuth] Expected callback URL:', `${baseUrl}/api/auth/callback/google`);

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔐 [NextAuth] signIn callback triggered', {
        provider: account?.provider,
        hasEmail: !!user.email,
        email: user.email,
        hasAccount: !!account,
        hasProfile: !!profile
      });

      // For credentials provider (E2E tests), user is already set up in authorize()
      if (account?.provider === 'e2e-credentials') {
        console.log('🔐 [NextAuth] E2E credentials sign-in, user already set up');
        return true;
      }
      
      if (account?.provider === 'google') {
        // For Google OAuth, ensure user exists in our database
        try {
          // Check database connection first
          await prisma.$connect();

          if (!user.email) {
            console.error('❌ [NextAuth] No email provided in user object');
            console.error('❌ [NextAuth] User object:', JSON.stringify(user, null, 2));
            return false;
          }
          
          console.log('🔐 [NextAuth] Creating/updating user:', user.email);
          console.log('🔐 [NextAuth] User data:', { email: user.email, name: user.name, image: user.image });
          
          // Use prismaUnscoped to avoid workspace scoping issues during sign-in
          // During authentication, we don't have a workspace context yet
          const dbUser = await prismaUnscoped.user.upsert({
            where: { email: user.email },
            update: {
              name: user.name,
              image: user.image,
              emailVerified: new Date(),
            },
            create: {
              email: user.email,
              name: user.name || 'User',
              image: user.image,
              emailVerified: new Date(),
            }
          });
          console.log('✅ [NextAuth] User created/updated successfully:', dbUser.id);
          // Attach database user ID to user object for JWT callback
          user.id = dbUser.id;
          return true;
        } catch (error: any) {
          console.error('❌ [NextAuth] Error creating/updating user:', error);
          console.error('❌ Error message:', error?.message);
          console.error('❌ Error code:', error?.code);
          console.error('❌ Error stack:', error?.stack);
          console.error('❌ [NextAuth] User data:', { email: user.email, name: user.name });
          console.error('❌ [NextAuth] Error details:', error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : error);

          // If it's a database connection error, log it but don't fail auth
          if (error?.code === 'P1001' || error?.message?.includes('connect') || error?.message?.includes('timeout')) {
            console.error('⚠️ Database connection issue - allowing auth to proceed');
          }

          // Don't fail authentication for database errors - let user in
          // The user can still authenticate, we'll handle DB issues later
          return true;
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session?.user) {
        // Set user ID from token.sub or token.id
        if (token.sub) {
          session.user.id = token.sub;
        } else if (token.id) {
          session.user.id = token.id;
        } else if (token.email) {
          // Fallback: look up user by email if token doesn't have ID
          try {
            const dbUser = await prisma.user.findUnique({
              where: { email: token.email as string },
              select: { id: true }
            });
            if (dbUser) {
              session.user.id = dbUser.id;
              console.log('✅ Session: Set user ID from database lookup:', dbUser.id);
            }
          } catch (prismaError: any) {
            console.error('[Session] Prisma lookup failed:', prismaError.message);
            // If Prisma fails, we can't proceed - log error but don't crash
          }
        }
        // Pass workspace data from token to session (avoids API calls on client)
        session.user.workspaceId = token.workspaceId as string | undefined;
        session.user.role = token.role as string | undefined;
        session.user.isFirstTime = token.isFirstTime as boolean | undefined;
        session.user.onboardingComplete = token.onboardingComplete as boolean | undefined;
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
        session.expiresAt = token.expiresAt;
      }
      // Also support activeOrgId for backward compatibility
      (session as any).activeOrgId = (token as any).activeOrgId || null;
      return session;
    },
    async jwt({ token, user, account, trigger, session }) {
      // Persist user id
      if (user) {
        token.email = user.email;
        token.name = user.name;

        // Always look up user by email to get database ID
        // NextAuth doesn't reliably pass user.id from signIn callback
        if (user.email) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { email: user.email },
              select: { id: true }
            });
            if (dbUser) {
              token.id = dbUser.id;
              token.sub = dbUser.id; // Set sub for session callback
              console.log('✅ JWT: Set user ID from database:', dbUser.id);
            } else {
              console.warn('⚠️ JWT: User not found in database:', user.email);
            }
          } catch (prismaError: any) {
            console.error('[JWT] Prisma lookup failed:', prismaError.message);
            // If Prisma fails, we can't proceed - log error but don't crash
          }
        }
        
        // Fetch workspace membership on initial login (when user object exists)
        // This eliminates the need for /api/auth/user-status calls on every page
        try {
          const dbUser = await prismaUnscoped.user.findUnique({
            where: { email: user.email! },
            select: { id: true }
          });
          
          if (dbUser) {
            const membership = await prismaUnscoped.workspaceMember.findFirst({
              where: { userId: dbUser.id },
              orderBy: { joinedAt: 'asc' },
              select: { workspaceId: true, role: true, workspace: { select: { onboardingCompletedAt: true } } }
            });
            
            if (membership) {
              token.workspaceId = membership.workspaceId;
              token.role = membership.role;
              token.isFirstTime = false;
              token.onboardingComplete = membership.workspace.onboardingCompletedAt !== null;
            } else {
              token.isFirstTime = true;
            }
          }
        } catch (error) {
          console.error('[NextAuth] Error fetching workspace membership:', error);
          // Don't fail auth - workspace will be fetched via API fallback
        }
      }

      // If token already has email but no sub, try to look up user
      if (token.email && !token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { id: true }
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.sub = dbUser.id;
            console.log('✅ JWT: Set user ID from token email:', dbUser.id);
          }
        } catch (error) {
          console.error('❌ Error looking up user by token email:', error);
        }
      }
      
      // PHASE A1: Ensure JWT always has workspaceId if user has a workspace
      // Fallback: If token has email but no workspaceId, fetch from DB
      if (token.email && !token.workspaceId) {
        try {
          const dbUser = await prismaUnscoped.user.findUnique({
            where: { email: token.email as string },
            select: { id: true }
          });
          
          if (dbUser) {
            const membership = await prismaUnscoped.workspaceMember.findFirst({
              where: { userId: dbUser.id },
              orderBy: { joinedAt: 'asc' },
              select: { workspaceId: true, role: true, workspace: { select: { onboardingCompletedAt: true } } }
            });
            
            if (membership) {
              token.workspaceId = membership.workspaceId;
              token.role = membership.role;
              token.isFirstTime = false;
              token.onboardingComplete = membership.workspace.onboardingCompletedAt !== null;
              console.log('✅ JWT: Set workspaceId from DB fallback:', membership.workspaceId);
            } else {
              token.isFirstTime = true;
              console.log('✅ JWT: User has no workspace (isFirstTime=true)');
            }
          }
        } catch (error) {
          console.error('[NextAuth] Error fetching workspace in jwt callback fallback:', error);
          // Don't fail auth - workspace will be fetched via API fallback
        }
      }
      
      // Handle session update trigger (e.g., after workspace switch or onboarding completion)
      if (trigger === 'update') {
        // Allow client to update activeOrgId via session update
        if (session) {
          const nextOrg = (session as any).activeOrgId;
          if (typeof nextOrg === "string") {
            (token as any).activeOrgId = nextOrg;
          }
        }

        // Always refresh workspace membership on update trigger
        if (token.email) {
          try {
            const dbUser = await prismaUnscoped.user.findUnique({
              where: { email: token.email as string },
              select: { id: true }
            });
            
            if (dbUser) {
              const membership = await prismaUnscoped.workspaceMember.findFirst({
                where: { userId: dbUser.id },
                orderBy: { joinedAt: 'asc' },
                select: { workspaceId: true, role: true, workspace: { select: { onboardingCompletedAt: true } } }
              });
              
              if (membership) {
                token.workspaceId = membership.workspaceId;
                token.role = membership.role;
                token.isFirstTime = false;
                token.onboardingComplete = membership.workspace.onboardingCompletedAt !== null;
              }
            }
          } catch (error) {
            console.error('[NextAuth] Error updating workspace in token:', error);
          }
        }
      }
      
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      // In development, if OAuth callback came from ngrok, redirect back to localhost
      if (process.env.NODE_ENV === 'development' && baseUrl.includes('ngrok')) {
        // Extract the path from the ngrok URL and redirect to localhost
        const urlObj = new URL(url);
        const localhostUrl = `http://localhost:3000${urlObj.pathname}${urlObj.search}`;
        console.log('🔄 Redirecting from ngrok to localhost:', localhostUrl);
        return localhostUrl;
      }
      
      // Determine final redirect URL
      let finalUrl: string;
      const isRelative = url.startsWith('/');
      
      if (isRelative) {
        finalUrl = `${baseUrl}${url}`;
      } else {
        // url is absolute - check if same origin
        try {
          const urlObj = new URL(url);
          const baseUrlObj = new URL(baseUrl);
          if (urlObj.origin === baseUrlObj.origin) {
            finalUrl = url;
          } else {
            finalUrl = baseUrl;
          }
        } catch (error) {
          // If URL parsing fails, treat as relative
          finalUrl = `${baseUrl}${url}`;
        }
      }
      
      // Log redirect callback for debugging invite flow
      // Only parse URLs for logging if they're absolute (to avoid errors)
      const logContext: any = {
        url,
        baseUrl,
        finalUrl,
        isRelative,
      };
      
      if (!isRelative) {
        try {
          const urlObj = new URL(url);
          const baseUrlObj = new URL(baseUrl);
          logContext.urlOrigin = urlObj.origin;
          logContext.baseUrlOrigin = baseUrlObj.origin;
          logContext.isSameOrigin = urlObj.origin === baseUrlObj.origin;
        } catch (error) {
          // If URL parsing fails, skip origin comparison
          logContext.urlParseError = 'Failed to parse URL';
        }
      } else {
        logContext.isSameOrigin = true; // Relative URLs are always same origin
      }
      
      logger.info('NextAuth redirect callback', logContext);
      
      return finalUrl;
    },
  },
  providers: [
    // Add Google provider if credentials are available
    ...(hasGoogleCredentials ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        authorization: {
          params: {
            scope: [
              'openid',
              'https://www.googleapis.com/auth/userinfo.email',
              'https://www.googleapis.com/auth/userinfo.profile',
              'https://www.googleapis.com/auth/calendar.readonly',
            ].join(' '),
            access_type: 'offline',
            prompt: 'consent', // Force consent screen to get refresh token
          },
        },
      })
    ] : []),
    
    // E2E Test Auth: Credentials provider for automated testing
    // Only available when E2E_TEST_AUTH=true AND NOT in production
    ...(isE2ETestAuthEnabled ? [
      CredentialsProvider({
        id: 'e2e-credentials',
        name: 'E2E Test Login',
        credentials: {
          password: { label: 'Test Password', type: 'password' }
        },
        async authorize(credentials) {
          console.log('[E2E Auth] authorize called with credentials:', JSON.stringify(credentials, null, 2));
          
          // Validate test password
          const testPassword = process.env.E2E_TEST_PASSWORD;
          console.log('[E2E Auth] E2E_TEST_PASSWORD set:', !!testPassword);
          
          if (!testPassword) {
            console.error('[E2E Auth] E2E_TEST_PASSWORD not set');
            return null;
          }
          
          const providedPassword = credentials?.password;
          console.log('[E2E Auth] Provided password matches:', providedPassword === testPassword);
          
          if (providedPassword !== testPassword) {
            console.error('[E2E Auth] Invalid test password. Expected:', testPassword?.substring(0, 3) + '..., got:', providedPassword?.substring(0, 3) + '...');
            return null;
          }
          
          // Create or update test user
          const testEmail = 'e2e-test@loopwell.test';
          const testName = 'E2E Test User';
          
          try {
            const user = await prismaUnscoped.user.upsert({
              where: { email: testEmail },
              update: { name: testName, emailVerified: new Date() },
              create: { 
                email: testEmail, 
                name: testName, 
                emailVerified: new Date() 
              }
            });
            
            // Ensure user has a workspace
            // PHASE 1: Use explicit select to exclude employmentStatus
            let membership = await prismaUnscoped.workspaceMember.findFirst({
              where: { userId: user.id },
              select: {
                id: true,
                workspaceId: true,
                userId: true,
                role: true,
                joinedAt: true,
                workspace: {
                  select: { id: true, name: true, slug: true }
                }
                // Exclude employmentStatus - may not exist in database yet
              }
            });
            
            if (!membership) {
              // Create a test workspace
              const workspace = await prismaUnscoped.workspace.create({
                data: {
                  name: 'E2E Test Workspace',
                  slug: 'e2e-test-workspace',
                  ownerId: user.id
                }
              });
              
              membership = await prismaUnscoped.workspaceMember.create({
                data: {
                  workspaceId: workspace.id,
                  userId: user.id,
                  role: 'OWNER'
                },
                include: { workspace: true }
              });
              await ensureOrgPositionForUser(prismaUnscoped, {
                workspaceId: workspace.id,
                userId: user.id,
              });
            }
            
            console.log('[E2E Auth] Test user authenticated:', user.id);
            
            return {
              id: user.id,
              email: user.email,
              name: user.name,
            };
          } catch (error) {
            console.error('[E2E Auth] Error creating test user:', error);
            return null;
          }
        }
      })
    ] : [])
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/login',
  },
};
