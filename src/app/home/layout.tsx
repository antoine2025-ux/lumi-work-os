"use client"

import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import { Header } from "@/components/layout/header"
import { LoopbrainAssistantProvider } from "@/components/loopbrain/assistant-context"
import { useUserStatusContext } from '@/providers/user-status-provider'
import { getRedirectDecisionWithCookie } from '@/lib/redirect-handler'

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  // Use centralized UserStatusContext - no separate API call needed
  const { workspaceId, isFirstTime, isLoading: isLoadingWorkspace, pendingInvite, error, refetch } = useUserStatusContext()

  const pathname = usePathname()
  const hasRedirected = useRef(false)
  const prevPathname = useRef(pathname)

  // Handle workspace redirect logic based on context data
  useEffect(() => {
    // Reset redirect flag when pathname changes
    if (prevPathname.current !== pathname) {
      hasRedirected.current = false
      prevPathname.current = pathname
    }

    // Skip if already redirected
    if (hasRedirected.current) {
      return
    }

    // Use centralized redirect handler
    const decision = getRedirectDecisionWithCookie({
      session,
      sessionStatus: status,
      workspaceId: workspaceId || null,
      isFirstTime: isFirstTime || false,
      pendingInvite: pendingInvite || null,
      pathname,
      isLoading: isLoadingWorkspace,
      error: error || null,
    })

    if (decision.shouldRedirect && decision.target) {
      hasRedirected.current = true
      window.location.href = decision.target
    }
  }, [workspaceId, isLoadingWorkspace, pendingInvite, status, pathname, session, isFirstTime, error])

  // Auth redirect is now handled by centralized redirect handler above
  // This effect is kept for logout flag handling only
  useEffect(() => {
    if (status === "loading") return
    
    // Check for logout flag - if set, redirect to login immediately and clear flag
    const logoutFlag = sessionStorage.getItem('__logout_flag__')
    if (logoutFlag === 'true') {
      sessionStorage.removeItem('__logout_flag__')
      window.location.href = '/login'
    }
  }, [status])

  // Show loading while checking session or workspace
  if (status === "loading" || isLoadingWorkspace) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-3 text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!session) {
    return null
  }
  
  // Don't render anything while workspace is being checked
  if (!workspaceId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-3 text-sm text-muted-foreground">Checking workspace...</p>
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

