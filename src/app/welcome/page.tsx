'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WelcomeScreen } from '@/components/onboarding/welcome-screen'
import { Loader2 } from 'lucide-react'

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
    setIsCreatingWorkspace(true)
    
    try {
      const response = await fetch('/api/workspace/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workspaceData),
      })

      if (response.ok) {
        // Workspace created successfully, redirect to dashboard
        router.push('/')
      } else {
        const error = await response.json()
        console.error('Failed to create workspace:', error)
        alert('Failed to create workspace. Please try again.')
      }
    } catch (error) {
      console.error('Error creating workspace:', error)
      alert('Failed to create workspace. Please try again.')
    } finally {
      setIsCreatingWorkspace(false)
    }
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
