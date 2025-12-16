import { cookies } from "next/headers"
import { redirect } from "next/navigation"

/**
 * Check if user is authenticated as blog admin via cookie
 * Returns true if valid cookie exists, false otherwise
 */
export async function isBlogAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const adminCookie = cookieStore.get("loopwell_blog_admin")
    return adminCookie?.value === "authenticated"
  } catch (error) {
    console.error("Error reading cookies in blog admin auth:", error)
    return false
  }
}

/**
 * Require blog admin authentication
 * Redirects to login page if not authenticated (for server components)
 * Throws error for API routes (should be caught and return 401)
 */
export async function requireBlogAdmin(): Promise<void> {
  const isAdmin = await isBlogAdmin()
  if (!isAdmin) {
    // In API routes, this will be caught and return 401
    // In server components, this will redirect
    redirect("/blog/dev-login")
  }
}

/**
 * Check blog admin authentication for API routes
 * Returns true if authenticated, false otherwise
 * Use this in API route handlers instead of requireBlogAdmin
 */
export async function checkBlogAdmin(): Promise<boolean> {
  try {
    return await isBlogAdmin()
  } catch (error) {
    console.error("Error checking blog admin auth:", error)
    return false
  }
}

