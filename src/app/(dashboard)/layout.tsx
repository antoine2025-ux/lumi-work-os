"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
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
      try {
        const response = await fetch('/api/auth/user-status')
        if (response.ok) {
          const data = await response.json()
          console.log('[DashboardLayout] User status:', data)
          
          // If no workspace, redirect immediately
          if (!data.workspaceId) {
            console.log('[DashboardLayout] No workspace found, redirecting to welcome immediately')
            window.location.href = '/welcome'
            return
          }
          
          setWorkspaceId(data.workspaceId)
          setIsFirstTime(data.isFirstTime || false)
        } else {
          const errorData = await response.json()
          console.log('[DashboardLayout] Error response:', errorData)
          
          // If error indicates no workspace, redirect
          if (errorData.error && errorData.error.includes('No workspace')) {
            console.log('[DashboardLayout] No workspace in error, redirecting to welcome')
            window.location.href = '/welcome'
            return
          }
        }
      } catch (error) {
        console.error('[DashboardLayout] Error checking workspace:', error)
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

  // Re-enable auth redirect
  useEffect(() => {
    if (status === "loading") return // Still loading session
    
    // Check for logout flag - if set, redirect to login immediately and clear flag
    const logoutFlag = sessionStorage.getItem('__logout_flag__')
    if (logoutFlag === 'true') {
      sessionStorage.removeItem('__logout_flag__')
      window.location.href = '/login'
      return
    }
    
    if (!session) {
      router.push("/login")
      return
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
