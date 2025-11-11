"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { Header } from "@/components/layout/header"

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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="min-h-screen">
        {children}
      </main>
    </div>
  )
}
