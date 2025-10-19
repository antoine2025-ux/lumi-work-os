'use client'

import React, { useState, useEffect } from 'react'
import { useTaskUpdates, useSocket } from '@/lib/realtime/socket-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PresenceIndicator } from './presence-indicator'
import { cn } from '@/lib/utils'
import { Clock, User, MessageCircle, MoreHorizontal, Plus, Maximize2 } from 'lucide-react'

interface LiveTaskListProps {
  projectId: string
  className?: string
  onToggleFullscreen?: () => void
}

export function LiveTaskList({ projectId, className, onToggleFullscreen }: LiveTaskListProps) {
  // Check if we're in a socket context before using the hooks
  let socket, actions, tasks, activeUsers, isLoading
  
  try {
    const socketHook = useSocket()
    socket = socketHook.socket
    actions = socketHook.actions
  } catch (error) {
    socket = null
    actions = { updateTask: () => {} }
  }
  
  try {
    const taskUpdatesHook = useTaskUpdates(projectId)
    tasks = taskUpdatesHook.tasks
    activeUsers = taskUpdatesHook.activeUsers
    isLoading = taskUpdatesHook.isLoading
  } catch (error) {
    tasks = []
    activeUsers = []
    isLoading = false
  }
  
  const [isUpdating, setIsUpdating] = useState<Set<string>>(new Set())

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    if (!socket) return
    
    setIsUpdating(prev => new Set(prev).add(taskId))
    
    try {
      actions.updateTask(taskId, { status: newStatus })
    } finally {
      // Remove from updating set after a delay
      setTimeout(() => {
        setIsUpdating(prev => {
          const newSet = new Set(prev)
          newSet.delete(taskId)
          return newSet
        })
      }, 1000)
    }
  }

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    if (!socket) return
    
    const updates = {
      status: completed ? 'DONE' : 'TODO',
      completedAt: completed ? new Date() : null
    }
    
    actions.updateTask(taskId, updates)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO': return 'bg-gray-100 text-gray-800'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'IN_REVIEW': return 'bg-yellow-100 text-yellow-800'
      case 'DONE': return 'bg-green-100 text-green-800'
      case 'BLOCKED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-gray-100 text-gray-600'
      case 'MEDIUM': return 'bg-blue-100 text-blue-600'
      case 'HIGH': return 'bg-orange-100 text-orange-600'
      case 'URGENT': return 'bg-red-100 text-red-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const isOverdue = (dueDate: string | Date) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString()
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Live Project Updates</CardTitle>
              <PresenceIndicator projectId={projectId} />
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading tasks...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Project Header with Live Presence */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Live Project Updates</CardTitle>
            <div className="flex items-center space-x-2">
              <PresenceIndicator projectId={projectId} />
              {onToggleFullscreen && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleFullscreen}
                  className="h-8 px-3 text-xs"
                >
                  <Maximize2 className="h-3 w-3 mr-1" />
                  Board View
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <Card 
            key={task.id} 
            className={cn(
              "transition-all duration-200 hover:shadow-md",
              isUpdating.has(task.id) && "opacity-70",
              task.status === 'DONE' && "opacity-75"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={task.status === 'DONE'}
                  onCheckedChange={(checked) => handleTaskComplete(task.id, !!checked)}
                  className="mt-1"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={cn(
                      "font-medium text-sm",
                      task.status === 'DONE' && "line-through text-muted-foreground"
                    )}>
                      {task.title}
                    </h3>
                    <Badge className={cn("text-xs", getStatusColor(task.status))}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                    <Badge className={cn("text-xs", getPriorityColor(task.priority))}>
                      {task.priority}
                    </Badge>
                  </div>
                  
                  {task.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {task.assignee && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{task.assignee.name}</span>
                      </div>
                    )}
                    
                    {task.dueDate && (
                      <div className={cn(
                        "flex items-center gap-1",
                        isOverdue(task.dueDate) && "text-red-600"
                      )}>
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(task.dueDate)}</span>
                        {isOverdue(task.dueDate) && <span className="text-red-600">(Overdue)</span>}
                      </div>
                    )}
                    
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        {task.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {task.tags.length > 3 && (
                          <span className="text-xs">+{task.tags.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const statuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']
                      const currentIndex = statuses.indexOf(task.status)
                      const nextStatus = statuses[(currentIndex + 1) % statuses.length]
                      handleTaskStatusChange(task.id, nextStatus)
                    }}
                    disabled={isUpdating.has(task.id)}
                  >
                    {isUpdating.has(task.id) ? '...' : '→'}
                  </Button>
                  
                  <Button variant="ghost" size="sm">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {tasks.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <p className="text-muted-foreground">No tasks yet. Create your first task to see live updates!</p>
              <Button 
                onClick={() => {
                  // This would open a task creation modal
                  console.log('Create new task')
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Task
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
