import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions)

// Export NextAuth handlers directly for Next.js 15 App Router
// The handler automatically handles GET and POST requests
export { handler as GET, handler as POST }
