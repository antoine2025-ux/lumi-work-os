'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface AuthWrapperProps {
  children: React.ReactNode
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Skip auth check for public routes
    const publicRoutes = ['/login', '/welcome', '/api/auth']
    if (publicRoutes.some(route => pathname.startsWith(route))) {
      setIsLoading(false)
      return
    }

    // Check user status directly using unified auth endpoint
    fetch('/api/auth/user-status')
      .then(res => res.json())
      .then(status => {
        if (!status.isAuthenticated) {
          // Not authenticated, redirect to login
          router.push('/login')
          return
        }
        
        if (status.isFirstTime || !status.workspaceId) {
          // First-time user or no workspace, redirect to welcome
          router.push('/welcome')
        } else {
          // Existing user with workspace, allow access
          setIsLoading(false)
        }
      })
      .catch((error) => {
        console.error('Auth status check failed:', error)
        // If status check fails, redirect to login
        router.push('/login')
      })
  }, [router, pathname])

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

  return <>{children}</>
}
