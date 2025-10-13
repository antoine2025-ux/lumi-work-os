'use client'

import React, { useState, useEffect } from 'react'
import { useNotifications } from '@/lib/realtime/socket-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertCircle, Info, MessageCircle, User, Calendar } from 'lucide-react'

interface NotificationToastProps {
  className?: string
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  maxNotifications?: number
}

export function NotificationToast({ 
  className,
  position = 'top-right',
  maxNotifications = 5
}: NotificationToastProps) {
  // Check if we're in a socket context before using the hook
  let notifications, clearNotification, clearAllNotifications
  
  try {
    const notificationHook = useNotifications()
    notifications = notificationHook.notifications
    clearNotification = notificationHook.clearNotification
    clearAllNotifications = notificationHook.clearAllNotifications
  } catch (error) {
    // If socket context is not available, use empty state
    notifications = []
    clearNotification = () => {}
    clearAllNotifications = () => {}
  }
  const [visibleNotifications, setVisibleNotifications] = useState<Set<string>>(new Set())

  // Show new notifications
  useEffect(() => {
    const latestNotification = notifications[0]
    if (latestNotification && !visibleNotifications.has(latestNotification.id)) {
      setVisibleNotifications(prev => new Set(prev).add(latestNotification.id))
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setVisibleNotifications(prev => {
          const newSet = new Set(prev)
          newSet.delete(latestNotification.id)
          return newSet
        })
      }, 5000)
    }
  }, [notifications, visibleNotifications])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_created':
      case 'task_updated':
      case 'task_deleted':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case 'comment_added':
        return <MessageCircle className="h-4 w-4 text-green-500" />
      case 'user_joined':
      case 'user_left':
        return <User className="h-4 w-4 text-purple-500" />
      case 'project_updated':
        return <Calendar className="h-4 w-4 text-orange-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'task_created':
        return 'border-l-green-500 bg-green-50'
      case 'task_updated':
        return 'border-l-blue-500 bg-blue-50'
      case 'task_deleted':
        return 'border-l-red-500 bg-red-50'
      case 'comment_added':
        return 'border-l-purple-500 bg-purple-50'
      case 'user_joined':
        return 'border-l-emerald-500 bg-emerald-50'
      case 'user_left':
        return 'border-l-gray-500 bg-gray-50'
      case 'project_updated':
        return 'border-l-orange-500 bg-orange-50'
      default:
        return 'border-l-gray-500 bg-gray-50'
    }
  }

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  }

  const visibleNotificationsList = notifications
    .filter(notif => visibleNotifications.has(notif.id))
    .slice(0, maxNotifications)

  if (visibleNotificationsList.length === 0) {
    return null
  }

  return (
    <div className={cn(
      "fixed z-50 space-y-2 max-w-sm",
      positionClasses[position],
      className
    )}>
      {visibleNotificationsList.map((notification) => (
        <Card 
          key={notification.id}
          className={cn(
            "border-l-4 shadow-lg animate-in slide-in-from-right-full duration-300",
            getNotificationColor(notification.type)
          )}
        >
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              {getNotificationIcon(notification.type)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {notification.type.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {notification.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                
                <p className="text-sm font-medium text-gray-900">
                  {notification.message}
                </p>
                
                {notification.data && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {notification.data.taskTitle && (
                      <p>Task: {notification.data.taskTitle}</p>
                    )}
                    {notification.data.projectName && (
                      <p>Project: {notification.data.projectName}</p>
                    )}
                  </div>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => {
                  setVisibleNotifications(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(notification.id)
                    return newSet
                  })
                  clearNotification(notification.id)
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {notifications.length > maxNotifications && (
        <div className="text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllNotifications}
            className="text-xs"
          >
            Clear all ({notifications.length})
          </Button>
        </div>
      )}
    </div>
  )
}

// Notification Bell Component
export function NotificationBell({ className }: { className?: string }) {
  // Check if we're in a socket context before using the hook
  let notifications
  
  try {
    const notificationHook = useNotifications()
    notifications = notificationHook.notifications
  } catch (error) {
    // If socket context is not available, use empty state
    notifications = []
  }
  
  const [isOpen, setIsOpen] = useState(false)

  const unreadCount = notifications.length

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <MessageCircle className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-background border rounded-lg shadow-lg z-50">
          <div className="p-3 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Notifications</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <div key={notification.id} className="p-3 border-b last:border-b-0 hover:bg-muted/50">
                  <div className="flex items-start gap-2">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {notification.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'task_created':
    case 'task_updated':
    case 'task_deleted':
      return <CheckCircle className="h-4 w-4 text-blue-500" />
    case 'comment_added':
      return <MessageCircle className="h-4 w-4 text-green-500" />
    case 'user_joined':
    case 'user_left':
      return <User className="h-4 w-4 text-purple-500" />
    case 'project_updated':
      return <Calendar className="h-4 w-4 text-orange-500" />
    default:
      return <Info className="h-4 w-4 text-gray-500" />
  }
}
