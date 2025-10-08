'use client'

import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useTaskUpdates } from '@/lib/realtime/socket-context'
import { cn } from '@/lib/utils'

interface PresenceIndicatorProps {
  projectId: string
  className?: string
  showNames?: boolean
  maxVisible?: number
}

export function PresenceIndicator({ 
  projectId, 
  className,
  showNames = true,
  maxVisible = 5
}: PresenceIndicatorProps) {
  const { activeUsers } = useTaskUpdates(projectId)

  if (activeUsers.length === 0) {
    return null
  }

  const visibleUsers = activeUsers.slice(0, maxVisible)
  const remainingCount = activeUsers.length - maxVisible

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex -space-x-2">
        {visibleUsers.map((user) => (
          <div key={user.userId} className="relative group">
            <Avatar className="h-8 w-8 border-2 border-background">
              <AvatarImage src={`/avatars/${user.userId}.jpg`} />
              <AvatarFallback className="text-xs">
                {user.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className={cn(
              "absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background",
              {
                "bg-green-500": user.status === 'online',
                "bg-yellow-500": user.status === 'away',
                "bg-gray-400": user.status === 'offline'
              }
            )} />
            {showNames && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                {user.userName}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-popover" />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {remainingCount > 0 && (
        <Badge variant="secondary" className="h-6 px-2 text-xs">
          +{remainingCount}
        </Badge>
      )}
      
      <div className="text-xs text-muted-foreground">
        {activeUsers.length} {activeUsers.length === 1 ? 'person' : 'people'} online
      </div>
    </div>
  )
}

interface UserPresenceProps {
  userId: string
  userName: string
  status: 'online' | 'away' | 'offline'
  size?: 'sm' | 'md' | 'lg'
  showStatus?: boolean
}

export function UserPresence({ 
  userId, 
  userName, 
  status, 
  size = 'md',
  showStatus = true 
}: UserPresenceProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  }

  const statusSizeClasses = {
    sm: 'h-2 w-2 -bottom-0.5 -right-0.5',
    md: 'h-3 w-3 -bottom-1 -right-1',
    lg: 'h-4 w-4 -bottom-1.5 -right-1.5'
  }

  return (
    <div className="relative group">
      <Avatar className={cn("border-2 border-background", sizeClasses[size])}>
        <AvatarImage src={`/avatars/${userId}.jpg`} />
        <AvatarFallback className={cn(
          "text-xs",
          size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
        )}>
          {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {showStatus && (
        <div className={cn(
          "absolute rounded-full border-2 border-background",
          statusSizeClasses[size],
          {
            "bg-green-500": status === 'online',
            "bg-yellow-500": status === 'away',
            "bg-gray-400": status === 'offline'
          }
        )} />
      )}
    </div>
  )
}
