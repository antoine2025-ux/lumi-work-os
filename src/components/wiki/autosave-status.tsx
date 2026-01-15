"use client"

import { CheckCircle2, Loader2, AlertCircle, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline'

interface AutosaveStatusProps {
  status: SaveStatus
  lastSaved?: Date | null
  className?: string
}

/**
 * Autosave status indicator component
 * Shows current save state with appropriate icon and message
 */
export function AutosaveStatus({ 
  status, 
  lastSaved, 
  className 
}: AutosaveStatusProps) {
  if (status === 'idle') {
    return null
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: Loader2,
          text: 'Saving...',
          className: 'text-muted-foreground',
          iconClassName: 'animate-spin'
        }
      case 'saved':
        return {
          icon: CheckCircle2,
          text: lastSaved 
            ? `Saved ${formatTime(lastSaved)}`
            : 'Saved',
          className: 'text-green-600 dark:text-green-400',
          iconClassName: ''
        }
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Error saving',
          className: 'text-red-600 dark:text-red-400',
          iconClassName: ''
        }
      case 'offline':
        return {
          icon: WifiOff,
          text: 'Offline',
          className: 'text-orange-600 dark:text-orange-400',
          iconClassName: ''
        }
      default:
        return null
    }
  }

  const config = getStatusConfig()
  if (!config) return null

  const Icon = config.icon

  return (
    <div className={cn(
      "flex items-center gap-2 text-sm",
      config.className,
      className
    )}>
      <Icon className={cn("h-4 w-4", config.iconClassName)} />
      <span>{config.text}</span>
    </div>
  )
}

function formatTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit' 
  })
}

