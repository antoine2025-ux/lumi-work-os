'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { RefreshCw } from 'lucide-react'
import { OpsWorkspaceSelect, OpsWorkspace } from './ops-workspace-select'

export type TimeRange = '15m' | '1h' | '24h' | '7d'

interface OpsToolbarProps {
  defaultRange?: TimeRange
  onRangeChange?: (range: TimeRange) => void
  workspaces?: OpsWorkspace[]
  currentWorkspaceId?: string | null
}

export function OpsToolbar({ 
  defaultRange = '24h', 
  onRangeChange,
  workspaces = [],
  currentWorkspaceId = null,
}: OpsToolbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Set mounted state on client only
  useEffect(() => {
    setIsMounted(true)
    setLastRefreshed(new Date())
  }, [])

  // Get current range from URL or use default
  const currentRange = (searchParams.get('range') as TimeRange) || defaultRange

  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setLastRefreshed(new Date())
    // Reset refreshing state after a short delay
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const handleRangeChange = (range: TimeRange) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', range)
    router.push(`${pathname}?${params.toString()}`)
    onRangeChange?.(range)
  }

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      router.refresh()
      setLastRefreshed(new Date())
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, router])

  const formatLastRefreshed = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-bold">Ops Console</h1>
        <p className="text-muted-foreground mt-2">
          Internal monitoring dashboard for performance and errors
        </p>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Workspace Selector */}
        <OpsWorkspaceSelect 
          workspaces={workspaces} 
          currentWorkspaceId={currentWorkspaceId} 
        />

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="time-range" className="text-sm text-muted-foreground whitespace-nowrap">
            Time Range:
          </label>
          <Select value={currentRange} onValueChange={handleRangeChange}>
            <SelectTrigger id="time-range" className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15m">15 minutes</SelectItem>
              <SelectItem value="1h">1 hour</SelectItem>
              <SelectItem value="24h">24 hours</SelectItem>
              <SelectItem value="7d">7 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Refresh Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>

        {/* Last Refreshed Timestamp */}
        {isMounted && lastRefreshed && (
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            Last: {formatLastRefreshed(lastRefreshed)}
          </div>
        )}

        {/* Auto-refresh Toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="auto-refresh"
            checked={autoRefresh}
            onCheckedChange={setAutoRefresh}
          />
          <label
            htmlFor="auto-refresh"
            className="text-sm text-muted-foreground whitespace-nowrap cursor-pointer"
          >
            Auto-refresh
          </label>
        </div>
      </div>
    </div>
  )
}

