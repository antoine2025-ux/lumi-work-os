'use client'

import { useSocket } from '@/lib/realtime/socket-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircle, Wifi, WifiOff, Loader2, RefreshCw } from 'lucide-react'
import { useState } from 'react'

export function ConnectionStatus() {
  // Check if we're in a socket context before using the hook
  let isConnected, isConnecting, isRetrying, error, connect, checkConnectionHealth
  
  try {
    const socketHook = useSocket()
    isConnected = socketHook.isConnected
    isConnecting = socketHook.isConnecting
    isRetrying = socketHook.isRetrying
    error = socketHook.error
    connect = socketHook.connect
    checkConnectionHealth = socketHook.checkConnectionHealth
  } catch (error) {
    // If socket context is not available, use default state
    isConnected = false
    isConnecting = false
    isRetrying = false
    error = 'Socket context not available'
    connect = async () => {}
    checkConnectionHealth = async () => false
  }
  
  const [isManualRetry, setIsManualRetry] = useState(false)
  const [isHealthy, setIsHealthy] = useState(true)

  const handleRetry = async () => {
    setIsManualRetry(true)
    try {
      // Get user data from session or context
      const userId = 'user-1' // This should come from auth context
      const userName = 'User' // This should come from auth context
      const workspaceId = 'workspace-1' // This should come from workspace context
      
      await connect(userId, userName, workspaceId)
    } catch (err) {
      console.error('Manual retry failed:', err)
    } finally {
      setIsManualRetry(false)
    }
  }

  const handleHealthCheck = async () => {
    const healthy = await checkConnectionHealth()
    setIsHealthy(healthy)
    if (!healthy && isConnected) {
      console.log('Connection health check failed, attempting reconnection')
      handleRetry()
    }
  }

  // Show mock socket status
  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Wifi className="h-3 w-3 mr-1" />
          Mock Mode
        </Badge>
        <span className="text-xs text-muted-foreground">Socket.IO disabled</span>
      </div>
    )
  }

  if (isConnecting || isRetrying) {
    return (
      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        Connecting...
      </Badge>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <WifiOff className="h-3 w-3 mr-1" />
          Error
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRetry}
          disabled={isManualRetry}
          className="h-6 px-2 text-xs"
        >
          {isManualRetry ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
        </Button>
      </div>
    )
  }

  return (
    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
      <AlertCircle className="h-3 w-3 mr-1" />
      Disconnected
    </Badge>
  )
}
