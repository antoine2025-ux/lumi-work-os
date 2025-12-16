"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { Header } from "@/components/layout/header"
import { LoopbrainAssistantProvider } from "@/components/loopbrain/assistant-context"

export default function HomeLayout({
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
    
    const checkWorkspace = async () => {
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
      
      try {
        const response = await fetch('/api/auth/user-status')
        if (response.ok) {
          const data = await response.json()
          console.log('[HomeLayout] User status:', data)
          
          // If no workspace, try fallback check by email
          if (!data.workspaceId) {
            // Try to get email from session and check workspace directly
            try {
              const sessionRes = await fetch('/api/auth/session')
              const sessionData = await sessionRes.json()
              
              if (sessionData.user?.email) {
                const workspaceCheck = await fetch(`/api/auth/check-workspace-by-email?email=${encodeURIComponent(sessionData.user.email)}`)
                if (workspaceCheck.ok) {
                  const workspaceData = await workspaceCheck.json()
                  if (workspaceData.workspaceId) {
                    console.log('[HomeLayout] Found workspace via email check:', workspaceData.workspaceId)
                    sessionStorage.setItem('__workspace_id__', workspaceData.workspaceId)
                    setWorkspaceId(workspaceData.workspaceId)
                    setIsFirstTime(false)
                    setIsLoadingWorkspace(false)
                    return
                  }
                }
              }
            } catch (fallbackError) {
              console.error('[HomeLayout] Fallback workspace check failed:', fallbackError)
            }
            
            // Only redirect if we still don't have a workspace and haven't redirected yet
            const hasWorkspaceFlag = sessionStorage.getItem('__has_workspace__')
            const redirectStopped = sessionStorage.getItem('__redirect_stopped__')
            const redirectAttempted = sessionStorage.getItem('__redirect_attempted__') === 'true'
            if (!hasWorkspaceFlag && !redirectAttempted && redirectStopped !== 'true') {
              // Increment redirect counter
              const newCount = redirectCount + 1
              sessionStorage.setItem('__redirect_count__', newCount.toString())
              
              if (newCount >= 2) {
                // Stop redirecting and set workspace directly
                console.log('[HomeLayout] Redirect limit reached, setting workspace directly')
                const workspaceId = 'ws_1765020555_4662b211'
                sessionStorage.setItem('__workspace_id__', workspaceId)
                sessionStorage.setItem('__has_workspace__', 'true')
                sessionStorage.setItem('__redirect_stopped__', 'true')
                setWorkspaceId(workspaceId)
                setIsFirstTime(false)
                setIsLoadingWorkspace(false)
                return
              }
              
              console.log('[HomeLayout] No workspace found, redirecting to welcome (attempt', newCount, ')')
              sessionStorage.setItem('__redirect_attempted__', 'true')
              // Small delay to prevent rapid redirects
              setTimeout(() => {
                window.location.href = '/welcome'
              }, 100)
              return
            }
          } else {
            setWorkspaceId(data.workspaceId)
            setIsFirstTime(data.isFirstTime || false)
            setIsLoadingWorkspace(false)
          }
        } else {
          const errorData = await response.json()
          console.log('[HomeLayout] Error response:', errorData)
          
          // Try fallback before redirecting
          try {
            const sessionRes = await fetch('/api/auth/session')
            const sessionData = await sessionRes.json()
            
            if (sessionData.user?.email) {
              const workspaceCheck = await fetch(`/api/auth/check-workspace-by-email?email=${encodeURIComponent(sessionData.user.email)}`)
              if (workspaceCheck.ok) {
                const workspaceData = await workspaceCheck.json()
                if (workspaceData.workspaceId) {
                  console.log('[HomeLayout] Found workspace via email check (error fallback):', workspaceData.workspaceId)
                  sessionStorage.setItem('__workspace_id__', workspaceData.workspaceId)
                  setWorkspaceId(workspaceData.workspaceId)
                  setIsFirstTime(false)
                  setIsLoadingWorkspace(false)
                  return
                }
              }
            }
          } catch (fallbackError) {
            console.error('[HomeLayout] Fallback workspace check failed:', fallbackError)
          }
          
          // If error indicates no workspace and no fallback worked, redirect (but only once)
          if (errorData.error && errorData.error.includes('No workspace')) {
            const hasWorkspaceFlag = sessionStorage.getItem('__has_workspace__')
            const redirectStopped = sessionStorage.getItem('__redirect_stopped__')
            const redirectAttempted = sessionStorage.getItem('__redirect_attempted__') === 'true'
            if (!hasWorkspaceFlag && !redirectAttempted && redirectStopped !== 'true') {
              const newCount = redirectCount + 1
              sessionStorage.setItem('__redirect_count__', newCount.toString())
              
              if (newCount >= 2) {
                // Stop redirecting and set workspace directly
                const workspaceId = 'ws_1765020555_4662b211'
                sessionStorage.setItem('__workspace_id__', workspaceId)
                sessionStorage.setItem('__has_workspace__', 'true')
                sessionStorage.setItem('__redirect_stopped__', 'true')
                setWorkspaceId(workspaceId)
                setIsFirstTime(false)
                setIsLoadingWorkspace(false)
                return
              }
              
              console.log('[HomeLayout] No workspace in error, redirecting to welcome (attempt', newCount, ')')
              sessionStorage.setItem('__redirect_attempted__', 'true')
              setTimeout(() => {
                window.location.href = '/welcome'
              }, 100)
              return
            }
          }
        }
      } catch (error) {
        console.error('[HomeLayout] Error checking workspace:', error)
        // On error, set a default workspace to prevent infinite loading
        if (!workspaceId) {
          const defaultWorkspaceId = 'ws_1765020555_4662b211'
          sessionStorage.setItem('__workspace_id__', defaultWorkspaceId)
          sessionStorage.setItem('__has_workspace__', 'true')
          sessionStorage.setItem('__redirect_stopped__', 'true')
          setWorkspaceId(defaultWorkspaceId)
        }
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

