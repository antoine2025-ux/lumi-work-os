'use client'

import { useState, useEffect } from 'react'
import type { HocuspocusProvider } from '@hocuspocus/provider'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface CollabUser {
  id: string
  name: string
  color: string
}

interface CollabPresenceProps {
  provider: HocuspocusProvider
  currentUserId?: string
  currentUserName?: string
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'
}

/**
 * Deduplicate users by id (same user in multiple tabs = one entry).
 * Returns array of unique users, current user first.
 */
function deduplicateUsers(
  states: Map<number, Record<string, unknown>>,
  currentUserId?: string
): CollabUser[] {
  const byId = new Map<string, CollabUser>()
  for (const state of states.values()) {
    const user = state?.user as { id?: string; name?: string; color?: string } | undefined
    if (!user) continue
    const id = (user.id as string) ?? 'anonymous'
    if (byId.has(id)) continue
    byId.set(id, {
      id,
      name: (user.name as string) ?? 'Anonymous',
      color: (user.color as string) ?? '#6B7280',
    })
  }
  const list = Array.from(byId.values())
  if (currentUserId) {
    list.sort((a, b) => (a.id === currentUserId ? -1 : b.id === currentUserId ? 1 : 0))
  }
  return list
}

export function CollabPresence({
  provider,
  currentUserId,
  currentUserName,
}: CollabPresenceProps) {
  const [users, setUsers] = useState<CollabUser[]>([])

  useEffect(() => {
    const awareness = provider.awareness
    if (!awareness) return

    const update = () => {
      const states = awareness.getStates()
      setUsers(deduplicateUsers(states, currentUserId))
    }

    update()
    awareness.on('update', update)
    return () => {
      awareness.off('update', update)
    }
  }, [provider, currentUserId])

  if (users.length === 0) return null

  const isOnlyYou = users.length === 1 && users[0]?.id === currentUserId

  return (
    <div className="flex items-center gap-2">
      {isOnlyYou ? (
        <span className="text-xs text-muted-foreground">Only you are editing</span>
      ) : (
        <div className="flex items-center gap-1.5">
          {users.map((user) => {
            const isCurrentUser = user.id === currentUserId
            const displayName = isCurrentUser ? 'You' : user.name
            const initials = getInitials(isCurrentUser ? (currentUserName ?? 'You') : user.name)

            return (
              <Tooltip key={user.id} content={isCurrentUser ? 'You' : user.name} side="top">
                <div
                  className={cn(
                    'flex items-center gap-1.5 px-1.5 py-0.5 rounded-md',
                    'text-xs font-medium'
                  )}
                  title={displayName}
                >
                  <div
                    className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
                    style={{ backgroundColor: user.color }}
                  >
                    {initials}
                  </div>
                  <span className="text-muted-foreground truncate max-w-[80px]">
                    {displayName}
                  </span>
                </div>
              </Tooltip>
            )
          })}
        </div>
      )}
    </div>
  )
}
