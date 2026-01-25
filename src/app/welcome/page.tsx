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
    // Check if user is coming from org page to create workspace - don't redirect in this case
    const urlParams = new URLSearchParams(window.location.search)
    const fromOrgPage = urlParams.get('from') === 'org' || document.referrer.includes('/org')
    
    
    // If user came from org page, skip ALL redirect logic and allow workspace creation
    if (fromOrgPage) {
      console.log('[welcome] User came from org page - allowing workspace creation, skipping all redirects')
      // Still need to load user for the form, but don't check workspace or redirect
      let isMounted = true
      const loadUserOnly = async () => {
        try {
          const sessionRes = await fetch('/api/auth/session')
          if (!sessionRes.ok) {
            console.warn('[welcome] Session fetch failed:', sessionRes.status)
            return
          }
          const contentType = sessionRes.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            console.warn('[welcome] Session response is not JSON:', contentType)
            return
          }
          const sessionData = await sessionRes.json()
          if (isMounted && sessionData.user) {
            setUser(sessionData.user)
          }
        } catch (error) {
          console.error('[welcome] Error loading user:', error)
        } finally {
          if (isMounted) {
            setIsLoading(false)
          }
        }
      }
      loadUserOnly()
      return // CRITICAL: Return early to prevent checkAndRedirect from running
    }

    // PHASE A2: Removed redirect loop prevention hacks - middleware handles redirects now
    
    let isMounted = true
    
    const checkAndRedirect = async () => {
      try {
        // Get user info from session first with timeout
        const sessionPromise = fetch('/api/auth/session')
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
        )
        
        const res = await Promise.race([sessionPromise, timeoutPromise]) as Response

        if (!res.ok) {
          console.warn('[welcome] Session fetch failed:', res.status)
          return
        }
        
        const contentType = res.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          console.warn('[welcome] Session response is not JSON:', contentType)
          return
        }

        const data = await res.json()
        console.log('[welcome] Session data:', data)
        
        if (!isMounted) return
        
        if (data.user && data.user.email) {
          setUser(data.user)

          // If user came from org page, skip workspace check and allow creation
          if (fromOrgPage) {
            console.log('[welcome] User came from org page - skipping workspace check, allowing creation')
            setIsLoading(false)
            return
          }

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
              const contentType = workspaceRes.headers.get('content-type')
              if (!contentType || !contentType.includes('application/json')) {
                console.warn('[welcome] Workspace check response is not JSON:', contentType)
                return
              }
              const workspaceData = await workspaceRes.json()
              console.log('[welcome] Workspace check result:', workspaceData)
              
              if (workspaceData.workspaceId) {
                console.log('[welcome] User has workspace, redirecting to dashboard')
                // PHASE A2: Removed sessionStorage flags - session update will refresh JWT
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

      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('[welcome] Workspace creation returned non-JSON:', {
          status: response.status,
          contentType,
          bodyPreview: text.substring(0, 200)
        })
        throw new Error(`Server returned ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('[welcome] Workspace creation response:', data)

      if (response.ok) {
        // Workspace created successfully - wait for minimum loader duration
        const elapsed = Date.now() - startTime
        const remainingTime = Math.max(0, minLoaderDuration - elapsed)
        
        setTimeout(() => {
          console.log('[welcome] Workspace created, redirecting to dashboard...')
          
          // PHASE B2: Removed workspace creation flags - session update will refresh JWT
          
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
