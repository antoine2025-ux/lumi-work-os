'use client'

import { useState, useEffect } from 'react'
import type { HocuspocusProvider } from '@hocuspocus/provider'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ViewingBadge } from './viewing-badge'

export type PresenceStatus = 'editing' | 'viewing' | 'idle'

interface CollabUser {
  id: string
  name: string
  color: string
  avatar?: string
  status?: PresenceStatus
}

interface CollabPresenceProps {
  provider: HocuspocusProvider
  currentUserId?: string
  currentUserName?: string
  showAvatars?: boolean
  maxVisible?: number
  showViewingBadge?: boolean
  className?: string
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
 * Returns array of unique users, sorted by status (editing > viewing > idle).
 */
function deduplicateUsers(
  states: Map<number, Record<string, unknown>>,
  currentUserId?: string
): CollabUser[] {
  const byId = new Map<string, CollabUser>()
  for (const state of states.values()) {
    const user = state?.user as { id?: string; name?: string; color?: string; avatar?: string } | undefined
    const status = (state?.status as PresenceStatus) ?? 'viewing'
    if (!user) continue
    const id = (user.id as string) ?? 'anonymous'
    if (byId.has(id)) continue
    byId.set(id, {
      id,
      name: (user.name as string) ?? 'Anonymous',
      color: (user.color as string) ?? '#6B7280',
      avatar: user.avatar as string | undefined,
      status,
    })
  }
  const list = Array.from(byId.values())
  
  // Sort: editing > viewing > idle, then alphabetically
  list.sort((a, b) => {
    const statusOrder = { editing: 0, viewing: 1, idle: 2 }
    const aOrder = statusOrder[a.status ?? 'viewing']
    const bOrder = statusOrder[b.status ?? 'viewing']
    if (aOrder !== bOrder) return aOrder - bOrder
    return a.name.localeCompare(b.name)
  })
  
  return list
}

function getStatusLabel(status: PresenceStatus): string {
  switch (status) {
    case 'editing':
      return 'editing'
    case 'viewing':
      return 'viewing'
    case 'idle':
      return 'idle'
    default:
      return 'viewing'
  }
}

export function CollabPresence({
  provider,
  currentUserId,
  currentUserName,
  showAvatars = true,
  maxVisible = 5,
  showViewingBadge = true,
  className,
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

  // Filter out current user from the list for avatar stack
  const otherUsers = users.filter((u) => u.id !== currentUserId)
  const totalCount = users.length
  const visibleUsers = otherUsers.slice(0, maxVisible)
  const overflowCount = otherUsers.length - maxVisible

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {showViewingBadge && <ViewingBadge count={totalCount} />}
      
      {showAvatars && otherUsers.length > 0 && (
        <div className="flex items-center">
          {visibleUsers.map((user, index) => {
            const isCurrentUser = user.id === currentUserId
            const displayName = isCurrentUser ? 'You' : user.name
            const initials = getInitials(isCurrentUser ? (currentUserName ?? 'You') : user.name)
            const status = user.status ?? 'viewing'
            const statusLabel = getStatusLabel(status)

            return (
              <Tooltip 
                key={user.id} 
                content={`${displayName} (${statusLabel})`}
                side="top"
              >
                <div
                  className={cn(
                    'relative h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 border-2 bg-background transition-all',
                    'hover:z-50 hover:scale-110 cursor-pointer',
                    index > 0 && '-ml-2',
                    status === 'editing' && 'animate-pulse',
                    status === 'idle' && 'opacity-50'
                  )}
                  style={{ 
                    borderColor: user.color,
                    zIndex: index,
                  }}
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={displayName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="h-full w-full rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
                      style={{ backgroundColor: user.color }}
                    >
                      {initials}
                    </div>
                  )}
                </div>
              </Tooltip>
            )
          })}
          {overflowCount > 0 && (
            <Tooltip
              content={`${overflowCount} more ${overflowCount === 1 ? 'person' : 'people'}`}
              side="top"
            >
              <div
                className={cn(
                  'relative h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold bg-muted text-muted-foreground border-2 border-border shrink-0',
                  'hover:z-50 hover:scale-110 cursor-pointer transition-all',
                  '-ml-2'
                )}
                style={{ zIndex: maxVisible }}
              >
                +{overflowCount}
              </div>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  )
}

