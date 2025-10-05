"use client"

import { Badge } from "@/components/ui/badge"
import { PermissionLevel } from "@/lib/permissions"

interface PermissionBadgeProps {
  level: PermissionLevel
  className?: string
}

export function PermissionBadge({ level, className = "" }: PermissionBadgeProps) {
  const getDisplayText = () => {
    switch (level) {
      case 'public':
        return 'Public'
      case 'team':
        return 'Team'
      case 'private':
        return 'Private'
      case 'restricted':
        return 'Restricted'
      default:
        return 'Private'
    }
  }

  const getVariant = () => {
    switch (level) {
      case 'public':
        return 'default' as const
      case 'team':
        return 'secondary' as const
      case 'private':
        return 'outline' as const
      case 'restricted':
        return 'destructive' as const
      default:
        return 'outline' as const
    }
  }

  return (
    <Badge variant={getVariant()} className={className}>
      {getDisplayText()}
    </Badge>
  )
}