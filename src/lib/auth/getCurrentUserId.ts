import { getUnifiedAuth } from "@/lib/unified-auth";
import { NextRequest } from "next/server";

/**
 * Centralized helper to get the current user ID.
 * Uses getUnifiedAuth which handles session/auth resolution.
 */
export async function getCurrentUserId(request?: NextRequest): Promise<string | null> {
  try {
    const auth = await getUnifiedAuth(request);
    return auth.user.userId;
  } catch (error: unknown) {
    console.error("[getCurrentUserId] Failed to get user ID:", error);
    return null;
  }
}

