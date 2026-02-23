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
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"

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

/**
 * Conditional wrapper - only applies ThemeProvider if NOT on landing page
 * Landing page uses next-themes, app pages use custom ThemeProvider
 */
function ConditionalThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Skip app's ThemeProvider on landing page - it has next-themes
  // Don't wait for mount, check pathname immediately
  if (pathname === '/') {
    return <>{children}</>
  }

  return <ThemeProvider>{children}</ThemeProvider>
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

  // Expose queryClient globally in dev mode for cache clearing
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as Window & { __queryClient?: typeof queryClient }).__queryClient = queryClient
  }

  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <QueryClientProvider client={queryClient}>
        {/* UserStatusProvider must be inside QueryClientProvider and SessionProvider */}
        <UserStatusProvider>
        <ConditionalThemeProvider>
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
        </ConditionalThemeProvider>
        </UserStatusProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
