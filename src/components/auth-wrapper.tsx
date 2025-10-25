'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useUserStatus } from '@/hooks/use-user-status'

interface AuthWrapperProps {
  children: React.ReactNode
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { userStatus, loading } = useUserStatus()

  useEffect(() => {
    // Skip auth check for public routes
    const publicRoutes = ['/login', '/welcome', '/api/auth']
    if (publicRoutes.some(route => pathname.startsWith(route))) {
      return
    }

    // Only redirect if we have user status data and loading is complete
    if (!loading && userStatus) {
      if (!userStatus.isAuthenticated) {
        // Not authenticated, redirect to login
        router.push('/login')
        return
      }
      
      if (userStatus.isFirstTime || !userStatus.workspaceId) {
        // First-time user or no workspace, redirect to welcome
        router.push('/welcome')
      }
    }
  }, [router, pathname, userStatus, loading])

  // Show loading only if we're on a protected route and still loading
  const publicRoutes = ['/login', '/welcome', '/api/auth']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  
  if (!isPublicRoute && loading) {
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
