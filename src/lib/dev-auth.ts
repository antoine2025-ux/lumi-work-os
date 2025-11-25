import { cookies } from "next/headers";
import { NextRequest } from "next/server";

/**
 * Check if user is authenticated as a developer
 */
export async function isDevAuthenticated(request?: NextRequest): Promise<boolean> {
  try {
    let sessionToken: string | undefined;
    
    if (request) {
      // For API routes, get cookie from request
      try {
        sessionToken = request.cookies.get("dev-blog-session")?.value;
      } catch (error) {
        console.error("Error reading cookies from request:", error);
        return false;
      }
    } else {
      // For server components, use cookies()
      try {
        const cookieStore = await cookies();
        sessionToken = cookieStore.get("dev-blog-session")?.value;
      } catch (error) {
        console.error("Error reading cookies from cookieStore:", error);
        return false;
      }
    }
    
    // Simple check - if session cookie exists, user is authenticated
    // In production, you might want to validate the token against a database
    return !!sessionToken;
  } catch (error) {
    console.error("Error in isDevAuthenticated:", error);
    return false;
  }
}

/**
 * Require dev authentication - throws error if not authenticated
 */
export async function requireDevAuth(request?: NextRequest): Promise<void> {
  const isAuth = await isDevAuthenticated(request);
  if (!isAuth) {
    throw new Error("Unauthorized: Developer authentication required");
  }
}
