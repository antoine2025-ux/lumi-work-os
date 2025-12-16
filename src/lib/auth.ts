import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/db"

// Check if we have Google OAuth credentials
const hasGoogleCredentials = process.env.GOOGLE_CLIENT_ID && 
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CLIENT_ID !== "REPLACE_WITH_GOOGLE_CLIENT_ID" &&
  process.env.GOOGLE_CLIENT_SECRET !== "REPLACE_WITH_GOOGLE_CLIENT_SECRET"

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === "development",
  // Don't set 'url' here - it affects all NextAuth operations
  // We'll handle OAuth callback URL in the provider config instead
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        // For Google OAuth, ensure user exists in our database
        try {
          console.log('🔐 Creating/updating user:', user.email)
          
          // Check database connection first
          await prisma.$connect()
          
          const dbUser = await prisma.user.upsert({
            where: { email: user.email! },
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
          console.log('✅ User created/updated successfully:', dbUser.id)
          // Attach database user ID to user object for JWT callback
          user.id = dbUser.id
          return true
        } catch (error: any) {
          console.error('❌ Error creating/updating user:', error)
          console.error('❌ Error message:', error?.message)
          console.error('❌ Error code:', error?.code)
          console.error('❌ Error stack:', error?.stack)
          console.error('❌ User data:', { email: user.email, name: user.name })
          
          // If it's a database connection error, log it but don't fail auth
          if (error?.code === 'P1001' || error?.message?.includes('connect') || error?.message?.includes('timeout')) {
            console.error('⚠️ Database connection issue - allowing auth to proceed')
          }
          
          // Don't fail authentication for database errors - let user in
          // The user can still authenticate, we'll handle DB issues later
          return true
        }
      }
      return true
    },
    async session({ session, token }) {
      if (session?.user) {
        // Set user ID from token.sub or token.id
        if (token.sub) {
          session.user.id = token.sub
        } else if (token.id) {
          session.user.id = token.id
        } else if (token.email) {
          // Fallback: look up user by email if token doesn't have ID
          try {
            const dbUser = await prisma.user.findUnique({
              where: { email: token.email as string },
              select: { id: true }
            })
            if (dbUser) {
              session.user.id = dbUser.id
              console.log('✅ Session: Set user ID from database lookup:', dbUser.id)
            }
          } catch (prismaError: any) {
            console.error('[Session] Prisma lookup failed:', prismaError.message)
            // If Prisma fails, we can't proceed - log error but don't crash
          }
        }
        
        session.accessToken = token.accessToken
        session.refreshToken = token.refreshToken
        session.expiresAt = token.expiresAt
      }
      return session
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.email = user.email
        token.name = user.name
        
        // Always look up user by email to get database ID
        // NextAuth doesn't reliably pass user.id from signIn callback
        if (user.email) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { email: user.email },
              select: { id: true }
            })
            if (dbUser) {
              token.id = dbUser.id
              token.sub = dbUser.id // Set sub for session callback
              console.log('✅ JWT: Set user ID from database:', dbUser.id)
            } else {
              console.warn('⚠️ JWT: User not found in database:', user.email)
            }
          } catch (prismaError: any) {
            console.error('[JWT] Prisma lookup failed:', prismaError.message)
            // If Prisma fails, we can't proceed - log error but don't crash
          }
        }
      }
      
      // If token already has email but no sub, try to look up user
      if (token.email && !token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { id: true }
          })
          if (dbUser) {
            token.id = dbUser.id
            token.sub = dbUser.id
            console.log('✅ JWT: Set user ID from token email:', dbUser.id)
          }
        } catch (error) {
          console.error('❌ Error looking up user by token email:', error)
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
      // Default behavior: redirect to the provided URL or base URL
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  providers: [
    // Add Google provider if credentials are available
    ...(hasGoogleCredentials ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
