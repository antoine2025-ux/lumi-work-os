"use client"

import { SessionProvider } from "next-auth/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@/components/theme-provider"
import { SocketProvider } from "@/lib/realtime/socket-context"
import { WorkspaceProvider } from "@/lib/workspace-context"
import { CommandPalette } from "@/components/ui/command-palette"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { AuthWrapper } from "@/components/auth-wrapper"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

function SocketWrapper({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const [workspaceId, setWorkspaceId] = useState<string>('')
  
  useEffect(() => {
    const fetchWorkspaceId = async () => {
      try {
        const response = await fetch('/api/auth/user-status')
        if (response.ok) {
          const userStatus = await response.json()
          if (userStatus.workspaceId) {
            setWorkspaceId(userStatus.workspaceId)
          }
        }
      } catch (error) {
        console.error('Error fetching workspace ID:', error)
      }
    }
    
    if (session?.user) {
      fetchWorkspaceId()
    }
  }, [session?.user])
  
  if (!session?.user || !workspaceId) {
    return <>{children}</>
  }

  return (
    <SocketProvider
      userId={session.user.id || 'anonymous'}
      userName={session.user.name || 'Anonymous User'}
      workspaceId={workspaceId}
    >
      {children}
    </SocketProvider>
  )
}

function KeyboardShortcutsWrapper({ children }: { children: React.ReactNode }) {
  useKeyboardShortcuts()
  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthWrapper>
            <WorkspaceProvider>
              <SocketWrapper>
                <KeyboardShortcutsWrapper>
                  {children}
                  <CommandPalette />
                </KeyboardShortcutsWrapper>
              </SocketWrapper>
            </WorkspaceProvider>
          </AuthWrapper>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
