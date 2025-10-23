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

    // Check if user is authenticated and if they're a first-time user
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (!data.user) {
          // No session, redirect to login
          router.push('/login')
          return
        }

        // Check user status using unified auth endpoint
        fetch('/api/auth/user-status')
          .then(res => res.json())
          .then(status => {
            if (status.isFirstTime) {
              // First-time user, redirect to welcome
              router.push('/welcome')
            } else {
              // Existing user, allow access
              setIsLoading(false)
            }
          })
          .catch(() => {
            // If status check fails, assume existing user
            setIsLoading(false)
          })
      })
      .catch(() => {
        // If session check fails, redirect to login
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
