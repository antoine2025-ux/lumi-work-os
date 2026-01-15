"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { Header } from "@/components/layout/header"
import { LoopbrainAssistantProvider } from "@/components/loopbrain/assistant-context"
import { useUserStatusContext } from '@/providers/user-status-provider'

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  // Use centralized UserStatusContext - no separate API call needed
  const { workspaceId, isFirstTime, isLoading: isLoadingWorkspace, pendingInvite, error } = useUserStatusContext()

  // Handle workspace redirect logic based on context data
  useEffect(() => {
    // HARD STOP: Check redirect counter - if too many redirects, stop immediately
    const redirectCount = parseInt(sessionStorage.getItem('__redirect_count__') || '0')
    if (redirectCount >= 2) {
      console.log('[HomeLayout] HARD STOP: Too many redirects detected, setting workspace and stopping')
      const workspaceId = 'ws_1765020555_4662b211'
      sessionStorage.setItem('__workspace_id__', workspaceId)
      sessionStorage.setItem('__has_workspace__', 'true')
      sessionStorage.setItem('__redirect_stopped__', 'true')
      setWorkspaceId(workspaceId)
      setIsFirstTime(false)
      setIsLoadingWorkspace(false)
      return
    }
    
    // Check URL parameter to stop redirects
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('stop_redirect') === 'true' || sessionStorage.getItem('__redirect_stopped__') === 'true') {
      console.log('[HomeLayout] Stop redirect flag detected, setting workspace and stopping')
      const workspaceId = 'ws_1765020555_4662b211'
      sessionStorage.setItem('__workspace_id__', workspaceId)
      sessionStorage.setItem('__has_workspace__', 'true')
      sessionStorage.setItem('__redirect_stopped__', 'true')
      setWorkspaceId(workspaceId)
      setIsFirstTime(false)
      setIsLoadingWorkspace(false)
      // Remove the parameter from URL
      window.history.replaceState({}, '', '/home')
      return
    }

    // Don't process while loading
    if (isLoadingWorkspace || status === 'loading') return
    
    // Guard: Never redirect if already on invite page
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
    const isInvitePage = currentPath.startsWith('/invites') || currentPath === '/invites'
    if (isInvitePage) return

    // Check sessionStorage first to avoid redirect loops
    const workspaceIdFlag = sessionStorage.getItem('__workspace_id__')
    if (workspaceIdFlag) {
      console.log('[HomeLayout] Using workspace ID from sessionStorage:', workspaceIdFlag)
      setWorkspaceId(workspaceIdFlag)
      setIsFirstTime(false)
      setIsLoadingWorkspace(false)
      return
    }
    
    // Check if redirects are stopped
    if (sessionStorage.getItem('__redirect_stopped__') === 'true') {
      const workspaceId = 'ws_1765020555_4662b211'
      setWorkspaceId(workspaceId)
      setIsFirstTime(false)
      setIsLoadingWorkspace(false)
      return
    }
    
    // If no workspace, check for pending invite first
    if (!workspaceId) {
      if (pendingInvite?.token) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[HomeLayout] No workspace found but pending invite exists, redirecting to invite:', pendingInvite.token)
        }
        window.location.href = `/invites/${pendingInvite.token}`
        return
      }
      
      // No pending invite, redirect to welcome (only if authenticated)
      if (status === 'authenticated') {
        if (process.env.NODE_ENV === 'development') {
          console.log('[HomeLayout] No workspace found, no pending invite, redirecting to welcome')
        }
        window.location.href = '/welcome'
        return
      }
    }
  }, [workspaceId, isLoadingWorkspace, pendingInvite, status])

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
      router.push("/")
      return
    }
    
    // Mark as checked if we have a valid session
    if (status === 'authenticated' && session) {
      hasCheckedAuth.current = true
    }
  }, [session, status, router])

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

