import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { prismaUnscoped } from "@/lib/db"

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
      if (account?.provider === 'google') {
        // For Google OAuth, ensure user exists in our database
        try {
          if (!user.email) {
            console.error('❌ No email provided in user object')
            return false
          }
          
          console.log('🔐 Creating/updating user:', user.email)
          
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
          console.log('✅ User created/updated successfully:', dbUser.id)
          return true
        } catch (error) {
          console.error('❌ Error creating/updating user:', error)
          console.error('❌ User data:', { email: user.email, name: user.name })
          console.error('❌ Error details:', error instanceof Error ? {
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
        session.accessToken = token.accessToken
        session.refreshToken = token.refreshToken
        session.expiresAt = token.expiresAt
      }
      return session
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
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
      // Default behavior: redirect to the provided URL or base URL
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
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
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/login',
  },
}
