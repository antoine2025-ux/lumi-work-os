import { DashboardProviders } from "./DashboardProviders";
import { DashboardLayoutClient } from "./DashboardLayoutClient";
import { getActiveOrgContext } from "@/server/orgContext";

import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import dynamic from "next/dynamic"
import { LoopbrainAssistantProvider } from "@/components/loopbrain/assistant-context"
import { TaskSidebar } from "@/components/tasks/task-sidebar"
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
  let ctx;
  try {
    ctx = await getActiveOrgContext();
  } catch (error) {
    console.error("[DashboardLayout] Error getting org context:", error);
    // Fallback to null org context if there's an error
    ctx = { userId: null, orgId: null, orgName: null, role: "VIEWER" as const };
  }
  
  const { data: session, status } = useSession()
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
    // Resilience: Don't redirect if user-status query failed - prevents infinite redirects
    if (status === 'authenticated' && !isLoadingWorkspace && !workspaceId && userStatus.isAuthenticated && !isUserStatusError) {
      const workspaceJustCreated = sessionStorage.getItem('__workspace_just_created__') === 'true'
      const isInvitePage = pathname?.startsWith('/invites') || pathname === '/invites'
      
      // Guard: Never redirect if already on invite page
      if (isInvitePage) {
        return
      }
      
      // Don't redirect if we're already on the welcome page
      if (pathname === '/welcome') {
        return
      }
      
      // Check for pending invite first
      if (userStatus.pendingInvite?.token) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[DashboardLayout] No workspace found but pending invite exists, redirecting to invite:', userStatus.pendingInvite.token)
        }
        window.location.href = `/invites/${userStatus.pendingInvite.token}`
        return
      }
      
      // No pending invite, redirect to welcome (unless workspace just created)
      if (!workspaceJustCreated) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[DashboardLayout] No workspace found, no pending invite, redirecting to welcome')
        }
        window.location.href = '/welcome'
      }
    }
    
    if (userStatus.isAuthenticated) {
      setIsFirstTime(userStatus.isFirstTime || false)
      // Clear workspace creation flag if workspace is found
      if (workspaceId) {
        sessionStorage.removeItem('__workspace_just_created__')
        sessionStorage.removeItem('__skip_loader__')
      }
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
  
  // Render immediately with loading state - don't block on workspace check
  // This allows LCP to happen much faster
  // BUT: Skip this check on invite pages - they don't need a workspace yet
  if (!isInvitePage && (isLoadingWorkspace || !workspaceId)) {
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

  return (
    <DashboardProviders initialOrgId={ctx.orgId} initialOrgName={ctx.orgName}>
      <DashboardLayoutClient>{children}</DashboardLayoutClient>
    </DashboardProviders>
  );
}
