"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { Header } from "@/components/layout/header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [isFirstTime, setIsFirstTime] = useState(false)
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true)

  useEffect(() => {
    const checkWorkspace = async () => {
      // Check for workspace creation flag - if set, wait a bit for workspace to be available
      const workspaceJustCreated = sessionStorage.getItem('__workspace_just_created__') === 'true'
      
      try {
        // If workspace was just created, add a minimal delay (reduced from 500ms to 200ms)
        if (workspaceJustCreated) {
          console.log('[DashboardLayout] Workspace just created, waiting a moment before checking...')
          await new Promise(resolve => setTimeout(resolve, 200))
        }
        
        const response = await fetch('/api/auth/user-status', {
          // Allow caching - the API route handles cache invalidation
          next: { revalidate: 30 }
        })
        if (response.ok) {
          const data = await response.json()
          console.log('[DashboardLayout] User status:', data)
          
          // If workspace was just created but still not found, wait a bit more and retry (reduced from 1000ms to 500ms)
          if (workspaceJustCreated && !data.workspaceId) {
            console.log('[DashboardLayout] Workspace just created but not found yet, retrying...')
            await new Promise(resolve => setTimeout(resolve, 500))
            const retryResponse = await fetch('/api/auth/user-status', {
              next: { revalidate: 30 }
            })
            if (retryResponse.ok) {
              const retryData = await retryResponse.json()
              if (retryData.workspaceId) {
                setWorkspaceId(retryData.workspaceId)
                setIsFirstTime(retryData.isFirstTime || false)
                setIsLoadingWorkspace(false)
                return
              }
            }
          }
          
          // If no workspace and workspace wasn't just created, redirect immediately
          if (!data.workspaceId && !workspaceJustCreated) {
            console.log('[DashboardLayout] No workspace found, redirecting to welcome immediately')
            window.location.href = '/welcome'
            return
          }
          
          // If still no workspace after retry, redirect
          if (!data.workspaceId) {
            console.log('[DashboardLayout] No workspace found after retry, redirecting to welcome')
            window.location.href = '/welcome'
            return
          }
          
          setWorkspaceId(data.workspaceId)
          setIsFirstTime(data.isFirstTime || false)
          
          // Clear the flag after successful workspace check
          if (workspaceJustCreated) {
            sessionStorage.removeItem('__workspace_just_created__')
            sessionStorage.removeItem('__skip_loader__')
          }
        } else {
          const errorData = await response.json()
          console.log('[DashboardLayout] Error response:', errorData)
          
          // If error indicates no workspace and workspace wasn't just created, redirect
          if (errorData.error && errorData.error.includes('No workspace') && !workspaceJustCreated) {
            console.log('[DashboardLayout] No workspace in error, redirecting to welcome')
            window.location.href = '/welcome'
            return
          }
          
          // If workspace was just created, give it another moment (reduced from 1000ms to 500ms)
          if (workspaceJustCreated) {
            console.log('[DashboardLayout] Error but workspace just created, retrying...')
            await new Promise(resolve => setTimeout(resolve, 500))
            const retryResponse = await fetch('/api/auth/user-status', {
              next: { revalidate: 30 }
            })
            if (retryResponse.ok) {
              const retryData = await retryResponse.json()
              if (retryData.workspaceId) {
                setWorkspaceId(retryData.workspaceId)
                setIsFirstTime(retryData.isFirstTime || false)
                sessionStorage.removeItem('__workspace_just_created__')
                sessionStorage.removeItem('__skip_loader__')
                setIsLoadingWorkspace(false)
                return
              }
            }
            // If still failing after retry, redirect to welcome
            window.location.href = '/welcome'
            return
          }
        }
      } catch (error) {
        console.error('[DashboardLayout] Error checking workspace:', error)
        // If workspace was just created, don't redirect on error - give it time
        if (!workspaceJustCreated) {
          window.location.href = '/welcome'
        }
      } finally {
        setIsLoadingWorkspace(false)
      }
    }
    
    if (status === 'authenticated' && session) {
      checkWorkspace()
    } else if (status === 'unauthenticated') {
      setIsLoadingWorkspace(false)
    }
  }, [session, status])

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
