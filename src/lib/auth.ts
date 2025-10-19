import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"

// Check if we have Google OAuth credentials
const hasGoogleCredentials = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && 
  process.env.GOOGLE_CLIENT_ID !== "your-google-client-id" && 
  process.env.GOOGLE_CLIENT_SECRET !== "your-google-client-secret"

export const authOptions: NextAuthOptions = {
  providers: [
    // Add credentials provider for development
    CredentialsProvider({
      id: "dev",
      name: "Development Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "dev@lumi.com" },
        name: { label: "Name", type: "text", placeholder: "Dev User" }
      },
      async authorize(credentials) {
        if (!credentials?.email) return null
        
        // Create or find the dev user
        const user = await prisma.user.upsert({
          where: { email: credentials.email },
          update: {},
          create: {
            email: credentials.email,
            name: credentials.name || "Dev User",
          },
        })
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    }),
    // Only add Google provider if credentials are available
    ...(hasGoogleCredentials ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      })
    ] : [])
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        // For Google OAuth, create or find user in database
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! }
          })
          
          if (!existingUser) {
            await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name || "Google User",
                image: user.image,
              },
            })
          }
          return true
        } catch (error) {
          console.error("Error creating user:", error)
          return false
        }
      }
      return true
    },
    async session({ session, token }) {
      if (session?.user && token?.sub) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
      }
      return token
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/login',
  },
}
