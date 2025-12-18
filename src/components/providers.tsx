"use client"

import { SessionProvider } from "next-auth/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@/components/theme-provider"
import { SocketProvider } from "@/lib/realtime/socket-context"
import { WorkspaceProvider } from "@/lib/workspace-context"
import { CommandPalette } from "@/components/ui/command-palette"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { AuthWrapper } from "@/components/auth-wrapper"
import { DataPrefetcher } from "@/components/data-prefetcher"
import { UserStatusProvider, useUserStatusContext } from "@/providers/user-status-provider"
import { useState } from "react"

/**
 * SocketWrapper - Provides real-time socket connection
 * Now uses UserStatusContext instead of making a separate API call
 */
function SocketWrapper({ children }: { children: React.ReactNode }) {
  // Use the centralized user status context - no API call needed
  const { user, workspaceId, isLoading } = useUserStatusContext()
  
  // Don't connect socket until we have user and workspace data
  if (isLoading || !user || !workspaceId) {
    return <>{children}</>
  }

  return (
    <SocketProvider
      userId={user.id || 'anonymous'}
      userName={user.name || 'Anonymous User'}
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
        staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh longer (increased from 2)
        gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache much longer (increased from 10)
        refetchOnWindowFocus: false, // Don't refetch on window focus - use cached data
        refetchOnMount: false, // Don't refetch if data is still fresh
        refetchOnReconnect: false, // Don't refetch on reconnect - use cached data
        retry: 1, // Only retry once on failure
        // Aggressive caching - prioritize cache over fresh data
        networkMode: 'online', // But still respect network status
      },
    },
  }))

  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <QueryClientProvider client={queryClient}>
        {/* UserStatusProvider must be inside QueryClientProvider and SessionProvider */}
        <UserStatusProvider>
          <ThemeProvider>
            <AuthWrapper>
              <WorkspaceProvider>
                <SocketWrapper>
                  <KeyboardShortcutsWrapper>
                    <DataPrefetcher />
                    {children}
                    <CommandPalette />
                  </KeyboardShortcutsWrapper>
                </SocketWrapper>
              </WorkspaceProvider>
            </AuthWrapper>
          </ThemeProvider>
        </UserStatusProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
