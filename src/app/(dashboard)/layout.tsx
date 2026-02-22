"use client";

import { DashboardProviders } from "./DashboardProviders";
import { DashboardLayoutClient } from "./DashboardLayoutClient";

import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import dynamic from "next/dynamic"
import { useUserStatusContext } from "@/providers/user-status-provider"

// Lazy load Header to reduce initial bundle size and improve LCP
const Header = dynamic(() => import("@/components/layout/header").then(mod => ({ default: mod.Header })), {
  ssr: true, // Keep SSR for header since it's above the fold
})

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession()
  
  // Get org context from session (client-side)
  const orgId = (session as unknown as { activeOrgId?: string | null })?.activeOrgId ?? null;
  const orgName = null; // orgName not available in session, will be loaded client-side if needed
  const router = useRouter()
  const pathname = usePathname()
  const [isFirstTime, setIsFirstTime] = useState(false)
  
  // Use centralized UserStatusContext - no separate API call needed
  // This reads from session JWT directly, eliminating redundant fetches
  const userStatus = useUserStatusContext()
  const isLoadingWorkspace = userStatus.isLoading
  const workspaceId = userStatus.workspaceId
  const isUserStatusError = !!userStatus.error

  // Handle workspace redirect
  // Skip redirect if user is on an invite page - they need to accept the invite first
  useEffect(() => {
    // PHASE B2/C2: Removed workspace redirect logic - middleware handles this now
    // This effect is kept for first-time state tracking only
    if (userStatus.isAuthenticated) {
      setIsFirstTime(userStatus.isFirstTime || false)
    }
  }, [status, isLoadingWorkspace, workspaceId, userStatus.isAuthenticated, userStatus.isFirstTime, userStatus.pendingInvite, isUserStatusError, pathname])

  // Re-enable auth redirect - but only check once per mount or when session actually changes
  const hasCheckedAuth = useRef(false)
  useEffect(() => {
    // Skip if we've already checked and session hasn't meaningfully changed
    if (hasCheckedAuth.current && status === 'authenticated' && session) {
      return
    }
    
    if (status === "loading") return // Still loading session
    
    // Check for logout flag - if set, redirect to login immediately and clear flag
    const logoutFlag = sessionStorage.getItem('__logout_flag__')
    if (logoutFlag === 'true') {
      sessionStorage.removeItem('__logout_flag__')
      window.location.href = '/login'
      return
    }
    
    // Only redirect if we're actually unauthenticated (not just refetching)
    if (status === 'unauthenticated' && !session) {
      hasCheckedAuth.current = true
      router.push("/login")
      return
    }
    
    // Mark as checked if we have a valid session
    if (status === 'authenticated' && session) {
      hasCheckedAuth.current = true
    }
  }, [session, status, router])

  // Show minimal loading state - don't block entire page render
  // Render header and skeleton immediately for better perceived performance
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="h-16 border-b border-slate-900 animate-pulse bg-slate-900" />
        <main className="min-h-screen p-8">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="h-8 w-64 bg-slate-900 rounded animate-pulse" />
            <div className="h-32 w-full bg-slate-900 rounded animate-pulse" />
          </div>
        </main>
      </div>
    )
  }

  if (!session) {
    return null
  }
  
  // Skip workspace requirement check if we're on an invite page
  // Users need to accept the invite first, which will create the workspace membership
  const isInvitePage = pathname?.startsWith('/invites')
  
  // Still loading workspace status -- show skeleton while we wait.
  // Skip this check on invite pages - they don't need a workspace yet.
  if (!isInvitePage && isLoadingWorkspace) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Header />
        <main className="min-h-screen">
          <div className="p-8">
            <div className="max-w-7xl mx-auto space-y-4">
              <div className="h-8 w-64 bg-slate-900 rounded animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 bg-slate-900 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Loading finished but no workspace exists (deleted or first-time user).
  // Redirect instead of rendering a perpetual skeleton.
  if (!isInvitePage && !workspaceId) {
    if (typeof window !== "undefined") {
      window.location.href = isFirstTime ? "/welcome" : "/login"
    }
    return null
  }

  return (
    <DashboardProviders initialOrgId={orgId} initialOrgName={orgName}>
      <DashboardLayoutClient>{children}</DashboardLayoutClient>
    </DashboardProviders>
  );
}
