import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { prismaUnscoped } from "@/lib/db"
import { logger } from "@/lib/logger"

// Check if we have Google OAuth credentials
const hasGoogleCredentials = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && 
  process.env.GOOGLE_CLIENT_ID !== "your-google-client-id" && 
  process.env.GOOGLE_CLIENT_SECRET !== "your-google-client-secret"

// Validate required NextAuth environment variables
if (!process.env.NEXTAUTH_SECRET) {
  console.warn('⚠️ NEXTAUTH_SECRET is not set. Authentication may not work correctly.')
}

if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ NEXTAUTH_URL is not set in production. Authentication may not work correctly.')
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  // Don't set 'url' here - it affects all NextAuth operations
  // We'll handle OAuth callback URL in the provider config instead
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔐 [NextAuth] signIn callback triggered', {
        provider: account?.provider,
        hasEmail: !!user.email,
        email: user.email,
        hasAccount: !!account,
        hasProfile: !!profile
      })

      if (account?.provider === 'google') {
        // For Google OAuth, ensure user exists in our database
        try {
          if (!user.email) {
            console.error('❌ [NextAuth] No email provided in user object')
            console.error('❌ [NextAuth] User object:', JSON.stringify(user, null, 2))
            return false
          }
          
          console.log('🔐 [NextAuth] Creating/updating user:', user.email)
          console.log('🔐 [NextAuth] User data:', { email: user.email, name: user.name, image: user.image })
          
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
          })
          console.log('✅ [NextAuth] User created/updated successfully:', dbUser.id)
          return true
        } catch (error) {
          console.error('❌ [NextAuth] Error creating/updating user:', error)
          console.error('❌ [NextAuth] User data:', { email: user.email, name: user.name })
          console.error('❌ [NextAuth] Error details:', error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : error)
          // Don't fail authentication for database errors - let user in
          return true
        }
      }
      return true
    },
    async session({ session, token }) {
      if (session?.user && token?.sub) {
        session.user.id = token.sub
        // Pass workspace data from token to session (avoids API calls on client)
        session.user.workspaceId = token.workspaceId as string | undefined
        session.user.role = token.role as string | undefined
        session.user.isFirstTime = token.isFirstTime as boolean | undefined
        session.accessToken = token.accessToken
        session.refreshToken = token.refreshToken
        session.expiresAt = token.expiresAt
      }
      return session
    },
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        
        // Fetch workspace membership on initial login (when user object exists)
        // This eliminates the need for /api/auth/user-status calls on every page
        try {
          const dbUser = await prismaUnscoped.user.findUnique({
            where: { email: user.email! },
            select: { id: true }
          })
          
          if (dbUser) {
            const membership = await prismaUnscoped.workspaceMember.findFirst({
              where: { userId: dbUser.id },
              orderBy: { joinedAt: 'asc' },
              select: { workspaceId: true, role: true }
            })
            
            if (membership) {
              token.workspaceId = membership.workspaceId
              token.role = membership.role
              token.isFirstTime = false
            } else {
              token.isFirstTime = true
            }
          }
        } catch (error) {
          console.error('[NextAuth] Error fetching workspace membership:', error)
          // Don't fail auth - workspace will be fetched via API fallback
        }
      }
      
      // Handle session update trigger (e.g., after workspace switch)
      if (trigger === 'update' && token.email) {
        try {
          const dbUser = await prismaUnscoped.user.findUnique({
            where: { email: token.email as string },
            select: { id: true }
          })
          
          if (dbUser) {
            const membership = await prismaUnscoped.workspaceMember.findFirst({
              where: { userId: dbUser.id },
              orderBy: { joinedAt: 'asc' },
              select: { workspaceId: true, role: true }
            })
            
            if (membership) {
              token.workspaceId = membership.workspaceId
              token.role = membership.role
              token.isFirstTime = false
            }
          }
        } catch (error) {
          console.error('[NextAuth] Error updating workspace in token:', error)
        }
      }
      
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }
      return token
    },
    async redirect({ url, baseUrl }) {
      // In development, if OAuth callback came from ngrok, redirect back to localhost
      if (process.env.NODE_ENV === 'development' && baseUrl.includes('ngrok')) {
        // Extract the path from the ngrok URL and redirect to localhost
        const urlObj = new URL(url)
        const localhostUrl = `http://localhost:3000${urlObj.pathname}${urlObj.search}`
        console.log('🔄 Redirecting from ngrok to localhost:', localhostUrl)
        return localhostUrl
      }
      
      // Determine final redirect URL
      let finalUrl: string
      const isRelative = url.startsWith('/')
      
      if (isRelative) {
        finalUrl = `${baseUrl}${url}`
      } else {
        // url is absolute - check if same origin
        try {
          const urlObj = new URL(url)
          const baseUrlObj = new URL(baseUrl)
          if (urlObj.origin === baseUrlObj.origin) {
            finalUrl = url
          } else {
            finalUrl = baseUrl
          }
        } catch (error) {
          // If URL parsing fails, treat as relative
          finalUrl = `${baseUrl}${url}`
        }
      }
      
      // Log redirect callback for debugging invite flow
      // Only parse URLs for logging if they're absolute (to avoid errors)
      const logContext: any = {
        url,
        baseUrl,
        finalUrl,
        isRelative,
      }
      
      if (!isRelative) {
        try {
          const urlObj = new URL(url)
          const baseUrlObj = new URL(baseUrl)
          logContext.urlOrigin = urlObj.origin
          logContext.baseUrlOrigin = baseUrlObj.origin
          logContext.isSameOrigin = urlObj.origin === baseUrlObj.origin
        } catch (error) {
          // If URL parsing fails, skip origin comparison
          logContext.urlParseError = 'Failed to parse URL'
        }
      } else {
        logContext.isSameOrigin = true // Relative URLs are always same origin
      }
      
      logger.info('NextAuth redirect callback', logContext)
      
      return finalUrl
    },
  },
  providers: [
    // Only add Google provider if credentials are available
    ...(hasGoogleCredentials ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        authorization: {
          params: {
            // Force account selection - Google will show account picker
            // Using 'consent' ensures fresh consent and account selection
            // Using 'select_account' ensures account picker is shown
            prompt: 'consent select_account', // Show both consent and account selection
            access_type: 'offline', // Request refresh token
            scope: "openid email profile https://www.googleapis.com/auth/calendar.readonly"
          }
        },
        // Ensure we always get fresh authorization
        allowDangerousEmailAccountLinking: false, // Don't link accounts automatically
      })
    ] : [])
  ],
  debug: process.env.NODE_ENV === 'development', // Enable debug logging in dev
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/login',
  },
}
