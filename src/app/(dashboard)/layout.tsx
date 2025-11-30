"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import dynamic from "next/dynamic"
import { LoopbrainAssistantProvider } from "@/components/loopbrain/assistant-context"

// Lazy load Header to reduce initial bundle size and improve LCP
const Header = dynamic(() => import("@/components/layout/header").then(mod => ({ default: mod.Header })), {
  ssr: true, // Keep SSR for header since it's above the fold
})

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isFirstTime, setIsFirstTime] = useState(false)
  
  // Use React Query for user status - automatic caching and no sequential delays
  const { data: userStatus, isLoading: isLoadingWorkspace } = useQuery({
    queryKey: ['user-status'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user-status')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch user status')
      }
      return response.json()
    },
    enabled: status === 'authenticated',
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry if no workspace (redirect instead)
      if (error?.message?.includes('No workspace')) return false
      return failureCount < 2
    },
  })

  const workspaceId = userStatus?.workspaceId || null

  // Handle workspace redirect
  useEffect(() => {
    if (status === 'authenticated' && !isLoadingWorkspace && !workspaceId) {
      const workspaceJustCreated = sessionStorage.getItem('__workspace_just_created__') === 'true'
      if (!workspaceJustCreated) {
        window.location.href = '/welcome'
      }
    }
    
    if (userStatus) {
      setIsFirstTime(userStatus.isFirstTime || false)
      // Clear workspace creation flag if workspace is found
      if (workspaceId) {
        sessionStorage.removeItem('__workspace_just_created__')
        sessionStorage.removeItem('__skip_loader__')
      }
    }
  }, [status, isLoadingWorkspace, workspaceId, userStatus])

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
  
  // Render immediately with loading state - don't block on workspace check
  // This allows LCP to happen much faster
  if (isLoadingWorkspace || !workspaceId) {
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
    <LoopbrainAssistantProvider>
      <div className="min-h-screen bg-slate-950">
        <Header />
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </LoopbrainAssistantProvider>
  )
}
