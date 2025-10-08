"use client"

import { SessionProvider } from "next-auth/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@/components/theme-provider"
import { SocketProvider } from "@/lib/realtime/socket-context"
import { WorkspaceProvider } from "@/lib/workspace-context"
import { CommandPalette } from "@/components/ui/command-palette"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { useState } from "react"
import { useSession } from "next-auth/react"

function SocketWrapper({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  
  if (!session?.user) {
    return <>{children}</>
  }

  return (
    <SocketProvider
      userId={session.user.id || 'anonymous'}
      userName={session.user.name || 'Anonymous User'}
      workspaceId="workspace-1" // TODO: Get from session or context
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
          <WorkspaceProvider>
            <SocketWrapper>
              <KeyboardShortcutsWrapper>
                {children}
                <CommandPalette />
              </KeyboardShortcutsWrapper>
            </SocketWrapper>
          </WorkspaceProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
