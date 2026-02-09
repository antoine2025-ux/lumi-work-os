'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
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
  const { update: updateSession } = useSession()
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
        const abortController = new AbortController()
        const timeoutId = setTimeout(() => {
          abortController.abort()
        }, 10000) // 10 seconds timeout
        
        try {
          const sessionRes = await fetch('/api/auth/session', {
            signal: abortController.signal,
          })
          
          clearTimeout(timeoutId)
          
          if (!sessionRes.ok) {
            console.warn('[welcome] Session fetch failed:', sessionRes.status)
            if (isMounted) {
              setIsLoading(false)
            }
            return
          }
          const contentType = sessionRes.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            console.warn('[welcome] Session response is not JSON:', contentType)
            if (isMounted) {
              setIsLoading(false)
            }
            return
          }
          const sessionData = await sessionRes.json()
          if (isMounted && sessionData.user) {
            setUser(sessionData.user)
          }
        } catch (error) {
          clearTimeout(timeoutId)
          if (error instanceof Error && error.name === 'AbortError') {
            console.warn('[welcome] Session fetch timeout when loading user')
          } else {
            console.error('[welcome] Error loading user:', error)
          }
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
      const abortController = new AbortController()
      const timeoutId = setTimeout(() => {
        abortController.abort()
      }, 10000) // Increased to 10 seconds for better reliability
      
      try {
        // Get user info from session first with timeout
        const res = await fetch('/api/auth/session', {
          signal: abortController.signal,
        })

        clearTimeout(timeoutId)

        if (!res.ok) {
          console.warn('[welcome] Session fetch failed:', res.status)
          if (isMounted) {
            setIsLoading(false)
          }
          return
        }
        
        const contentType = res.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          console.warn('[welcome] Session response is not JSON:', contentType)
          if (isMounted) {
            setIsLoading(false)
          }
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
          const workspaceAbortController = new AbortController()
          const workspaceTimeoutId = setTimeout(() => {
            workspaceAbortController.abort()
          }, 10000) // Increased to 10 seconds
          
          try {
            // Call a special endpoint that checks workspace by email with timeout
            const workspaceRes = await fetch(
              `/api/auth/check-workspace-by-email?email=${encodeURIComponent(data.user.email)}`,
              {
                signal: workspaceAbortController.signal,
              }
            )
            
            clearTimeout(workspaceTimeoutId)
            
            if (!isMounted) return
            
            if (workspaceRes.ok) {
              const contentType = workspaceRes.headers.get('content-type')
              if (!contentType || !contentType.includes('application/json')) {
                console.warn('[welcome] Workspace check response is not JSON:', contentType)
                if (isMounted) {
                  setIsLoading(false)
                }
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
          } catch (workspaceError) {
            clearTimeout(workspaceTimeoutId)
            if (workspaceError instanceof Error && workspaceError.name === 'AbortError') {
              console.warn('[welcome] Workspace check timeout - continuing to show welcome page')
            } else {
              console.error('[welcome] Error checking workspace by email:', workspaceError)
            }
            // Continue anyway - let user see welcome page
          }
        } else {
          // No session or no email - try to get email from cookies/localStorage as fallback
          console.log('[welcome] No user in session, checking for workspace anyway')
          // Don't redirect to login immediately - let the page load
          // The user might still be able to create a workspace
        }
      } catch (error) {
        clearTimeout(timeoutId)
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('[welcome] Session fetch timeout - showing welcome page anyway')
          // On timeout, still show the welcome page - user might be able to create workspace
        } else {
          console.error('[welcome] Error fetching session:', error)
        }
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
      
      // Step 1: Create workspace
      const response = await fetch('/api/workspace/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: workspaceData.name,
          slug: workspaceData.slug,
          description: workspaceData.description,
        }),
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

      // #region agent log
      const workspaceIdFromWorkspace = data?.workspace?.id
      const workspaceIdFromUser = data?.user?.workspaceId
      fetch('http://127.0.0.1:7242/ingest/2a79ccc7-8419-4f6b-84d3-31982e160042',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'welcome/page.tsx:handleCreateWorkspace',message:'Workspace create response check',data:{responseOk:response.ok,hasDataWorkspace:!!data?.workspace,workspaceIdFromWorkspace,workspaceIdFromUser,hasDataUser:!!data?.user},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion

      if (response.ok && (data.workspace?.id ?? data.user?.workspaceId)) {
        const workspaceId = data.workspace?.id ?? data.user?.workspaceId
        console.log('[welcome] Workspace created:', workspaceId)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/2a79ccc7-8419-4f6b-84d3-31982e160042',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'welcome/page.tsx:successBranch',message:'Success branch taken',data:{workspaceId},timestamp:Date.now(),runId:'post-fix',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        // Step 2: Save onboarding data
        console.log('[welcome] Saving onboarding data...')
        const onboardingResponse = await fetch(`/api/workspaces/${workspaceId}/onboarding`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mission: workspaceData.mission,
            industry: workspaceData.industry,
            companySize: workspaceData.teamSize,
            timezone: workspaceData.timezone,
            adminName: workspaceData.adminName,
            adminRole: workspaceData.adminRole,
            adminDepartment: workspaceData.adminDepartment,
          }),
        })

        if (!onboardingResponse.ok) {
          console.error('[welcome] Failed to save onboarding data')
          // Continue anyway - workspace is created
        } else {
          console.log('[welcome] Onboarding data saved successfully')
        }
        
        // Wait for minimum loader duration
        const elapsed = Date.now() - startTime
        const remainingTime = Math.max(0, minLoaderDuration - elapsed)
        
        setTimeout(async () => {
          console.log('[welcome] Onboarding complete, refreshing session...')
          // Refresh session so JWT gets workspaceId and isFirstTime: false (avoids redirect to /welcome when visiting /org etc.)
          try {
            await updateSession()
          } catch (e) {
            console.warn('[welcome] Session refresh failed, redirecting anyway', e)
          }
          if (typeof window !== 'undefined') {
            localStorage.removeItem('loopwell-onboarding-form-data')
          }
          window.location.href = '/home'
        }, remainingTime)
      } else {
        console.error('[welcome] Failed to create workspace:', JSON.stringify(data, null, 2))
        console.error('[welcome] Response status:', response.status)
        console.error('[welcome] Response headers:', Object.fromEntries(response.headers.entries()))
        setIsCreatingWorkspace(false)
        
        // Handle "already has workspace" case - redirect to home
        if (data?.existingWorkspaceId) {
          console.log('[welcome] User already has workspace, redirecting to home...')
          window.location.href = '/home'
          return
        }
        
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
