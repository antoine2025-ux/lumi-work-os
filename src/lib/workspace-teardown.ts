"use client"

import { signOut } from "next-auth/react"
import type { QueryClient } from "@tanstack/react-query"

/**
 * Deterministic workspace session teardown.
 *
 * Called after a workspace has been deleted on the server.
 * Clears every client-side state source in a fixed order so that
 * no stale workspace reference can survive:
 *
 *  1. Set __logout_flag__   – layout guards redirect immediately
 *  2. Clear React Query     – no cached API responses remain
 *  3. Clear localStorage    – workspace id / data removed
 *  4. Clear sessionStorage  – all keys except __logout_flag__
 *  5. signOut()             – invalidate the JWT cookie
 *  6. Hard redirect         – full page load to /login
 *
 * The function is intentionally aggressive: it signs the user out
 * even if they have other workspaces. A softer multi-workspace
 * flow can be added later as a follow-up.
 */
export async function teardownWorkspaceSession(
  queryClient: QueryClient
): Promise<void> {
  // STEP 1: Set the logout flag BEFORE clearing anything.
  // Layout guards (DashboardLayoutClient, layout.tsx, home/layout.tsx)
  // check this flag and redirect to /login immediately, which closes the
  // window between signOut() resolving and the JWT cookie being cleared.
  if (typeof window !== "undefined") {
    sessionStorage.setItem("__logout_flag__", "true")
  }

  // STEP 2: Nuke the entire React Query cache so no stale workspace
  // data can be read by any component that re-renders before the
  // hard redirect fires.
  queryClient.clear()

  // STEP 3: Remove workspace-specific localStorage entries.
  if (typeof window !== "undefined") {
    localStorage.removeItem("currentWorkspaceId")
    localStorage.removeItem("workspace-data")
  }

  // STEP 4: Clear all sessionStorage keys EXCEPT __logout_flag__.
  // The flag must survive until the login page clears it.
  if (typeof window !== "undefined") {
    const keysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && key !== "__logout_flag__") {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key))
  }

  // STEP 5: Sign out to clear the JWT cookie.
  // Using redirect: false so we control the redirect ourselves.
  try {
    await signOut({ redirect: false })
  } catch {
    // signOut failing is non-fatal – the __logout_flag__ already
    // ensures layout guards will redirect, and the hard redirect
    // below will force a full page reload anyway.
  }

  // STEP 6: Hard redirect to /login. This triggers a full page load
  // which discards all in-memory React state, QueryClient instances,
  // and any other transient client-side caches.
  if (typeof window !== "undefined") {
    window.location.href = "/login"
  }
}
