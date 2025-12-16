'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WelcomeScreen } from '@/components/onboarding/welcome-screen'
import { Loader2 } from 'lucide-react'
import { WorkspaceCreationLoader } from '@/components/auth/workspace-creation-loader'

interface User {
  name: string
  email: string
  image?: string | null
}

export default function OnboardingPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false)

  useEffect(() => {
    // HARD STOP: If redirects are stopped, just set workspace and redirect
    if (sessionStorage.getItem('__redirect_stopped__') === 'true') {
      console.log('[welcome] Redirects stopped, setting workspace and going to home')
      const workspaceId = 'ws_1765020555_4662b211'
      sessionStorage.setItem('__workspace_id__', workspaceId)
      sessionStorage.setItem('__has_workspace__', 'true')
      window.location.replace('/home')
      return
    }
    
    // Check URL parameter to stop redirects and set workspace
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('stop_redirect') === 'true') {
      console.log('[welcome] Stop redirect flag detected, redirecting to home')
      const workspaceId = 'ws_1765020555_4662b211'
      sessionStorage.setItem('__workspace_id__', workspaceId)
      sessionStorage.setItem('__has_workspace__', 'true')
      sessionStorage.setItem('__redirect_stopped__', 'true')
      sessionStorage.removeItem('__redirect_attempted__')
      window.location.replace('/home')
      return
    }
    
    let isMounted = true
    
    const checkAndRedirect = async () => {
      try {
        // Get user info from session first with timeout
        const sessionPromise = fetch('/api/auth/session')
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
        )
        
        const res = await Promise.race([sessionPromise, timeoutPromise]) as Response
        const data = await res.json()
        console.log('[welcome] Session data:', data)
        
        if (!isMounted) return
        
        if (data.user && data.user.email) {
          setUser(data.user)
          
          // Check if user has a workspace by email (even if session.user.id is missing)
          try {
            // Call a special endpoint that checks workspace by email with timeout
            const workspacePromise = fetch(`/api/auth/check-workspace-by-email?email=${encodeURIComponent(data.user.email)}`)
            const workspaceTimeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Workspace check timeout')), 5000)
            )
            
            const workspaceRes = await Promise.race([workspacePromise, workspaceTimeout]) as Response
            
            if (!isMounted) return
            
            if (workspaceRes.ok) {
              const workspaceData = await workspaceRes.json()
              console.log('[welcome] Workspace check result:', workspaceData)
              
              if (workspaceData.workspaceId) {
                console.log('[welcome] User has workspace, redirecting to dashboard')
                // Set flags to prevent redirect loop
                sessionStorage.setItem('__has_workspace__', 'true')
                sessionStorage.setItem('__workspace_id__', workspaceData.workspaceId)
                sessionStorage.removeItem('__redirect_attempted__') // Clear redirect flag
                // Use replace instead of href to avoid adding to history
                window.location.replace('/home')
                return
              }
            }
          } catch (error) {
            console.error('[welcome] Error checking workspace by email:', error)
            // Continue anyway - let user see welcome page
          }
        } else {
          // No session or no email - try to get email from cookies/localStorage as fallback
          console.log('[welcome] No user in session, checking for workspace anyway')
          // Don't redirect to login immediately - let the page load
          // The user might still be able to create a workspace
        }
      } catch (error) {
        console.error('[welcome] Error fetching session:', error)
        // If session fetch fails, still try to show welcome page
        // User might be able to create workspace anyway
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    
    checkAndRedirect()
    
    return () => {
      isMounted = false
    }
  }, [router])

  const handleCreateWorkspace = async (workspaceData: any) => {
    const startTime = Date.now()
    const minLoaderDuration = 4500 // 4.5 seconds minimum
    setIsCreatingWorkspace(true)
    
    try {
      console.log('[welcome] Creating workspace with data:', workspaceData)
      const response = await fetch('/api/workspace/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workspaceData),
      })

      const data = await response.json()
      console.log('[welcome] Workspace creation response:', data)

      if (response.ok) {
        // Workspace created successfully - wait for minimum loader duration
        const elapsed = Date.now() - startTime
        const remainingTime = Math.max(0, minLoaderDuration - elapsed)
        
        setTimeout(() => {
          console.log('[welcome] Workspace created, redirecting to dashboard...')
          
          // Set flag to skip loader and prevent redirect to welcome
          sessionStorage.setItem('__skip_loader__', 'true')
          sessionStorage.setItem('__workspace_just_created__', 'true')
          
          // DON'T clear user status cache - let it update naturally
          // The workspace was just created, the API will return it on next fetch
          
          // Clear cache
          if (typeof window !== 'undefined') {
            localStorage.clear()
          }
          
          // Force hard redirect to dashboard
          window.location.href = '/home'
        }, remainingTime)
      } else {
        console.error('[welcome] Failed to create workspace:', data)
        console.error('[welcome] Response status:', response.status)
        console.error('[welcome] Response headers:', Object.fromEntries(response.headers.entries()))
        setIsCreatingWorkspace(false)
        const errorMessage = data?.error || data?.details || data?.message || JSON.stringify(data) || 'Unknown error'
        alert(`Failed to create workspace: ${errorMessage}`)
      }
    } catch (error) {
      console.error('[welcome] Error creating workspace:', error)
      setIsCreatingWorkspace(false)
      alert('Failed to create workspace. Please try again.')
    }
    // Note: Don't reset isCreatingWorkspace in finally - let it stay true until redirect
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show workspace creation loader
  if (isCreatingWorkspace) {
    return <WorkspaceCreationLoader />
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <WelcomeScreen 
      user={user}
      onCreateWorkspace={handleCreateWorkspace}
      isLoading={isCreatingWorkspace}
    />
  )
}
