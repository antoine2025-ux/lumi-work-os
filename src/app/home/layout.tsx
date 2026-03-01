"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Header } from "@/components/layout/header"
import { LoopbrainAssistantProvider } from "@/components/loopbrain/assistant-context"
import { LoopbrainAssistantLauncher } from "@/components/loopbrain/assistant-launcher"
import { useUserStatusContext } from '@/providers/user-status-provider'
// PHASE C2: Removed redirect-handler import - middleware handles redirects

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const _router = useRouter()
  // Use centralized UserStatusContext - no separate API call needed
  const { workspaceId: _workspaceId, isFirstTime: _isFirstTime, isLoading: isLoadingWorkspace, pendingInvite: _pendingInvite, error: _error, refetch: _refetch } = useUserStatusContext()

  // PHASE C2: Removed workspace redirect logic - middleware handles all redirects now
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
  
  // PHASE C2: Removed workspace check blocking - middleware handles redirects
  // If user has no workspace, middleware will redirect to /welcome

  return (
    <LoopbrainAssistantProvider>
      <div className="min-h-screen bg-slate-950">
        <Header />
        <main className="min-h-screen">
          {children}
        </main>
      </div>
      <LoopbrainAssistantLauncher mode="dashboard" />
    </LoopbrainAssistantProvider>
  )
}

