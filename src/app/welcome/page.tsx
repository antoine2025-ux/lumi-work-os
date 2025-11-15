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
    // Get user info from session
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user)
        } else {
          // No session, redirect to login
          router.push('/login')
        }
      })
      .catch(() => {
        router.push('/login')
      })
      .finally(() => {
        setIsLoading(false)
      })
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
        setIsCreatingWorkspace(false)
        alert(`Failed to create workspace: ${data.error || 'Unknown error'}`)
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
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
