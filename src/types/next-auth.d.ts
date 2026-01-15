import NextAuth from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      // Workspace data embedded in session to avoid API calls
      workspaceId?: string
      role?: string
      isFirstTime?: boolean
    }
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    // Workspace data stored in JWT for session access
    workspaceId?: string
    role?: string
    isFirstTime?: boolean
  }
}
