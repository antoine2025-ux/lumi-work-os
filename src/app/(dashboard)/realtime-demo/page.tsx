'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LiveTaskList } from '@/components/realtime/live-task-list'
import { PresenceIndicator } from '@/components/realtime/presence-indicator'
import { NotificationToast, NotificationBell } from '@/components/realtime/notification-toast'
import { useSocket } from '@/lib/realtime/socket-context'
import { ArrowLeft, Plus, Users, Zap } from 'lucide-react'
import Link from 'next/link'

export default function RealtimeDemoPage() {
  const { socket, isConnected, isConnecting, error } = useSocket()
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [projectId] = useState('demo-project-1')

  const handleCreateTask = () => {
    if (!socket || !newTaskTitle.trim()) return
    
    const task = {
      title: newTaskTitle,
      description: 'Created via real-time demo',
      status: 'TODO',
      priority: 'MEDIUM',
      tags: ['demo', 'realtime']
    }
    
    socket.emit('createTask', { projectId, task })
    setNewTaskTitle('')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Real-time Demo</h1>
            <p className="text-muted-foreground">
              Experience live collaboration features
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <PresenceIndicator projectId={projectId} />
          <NotificationBell />
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge 
              variant={isConnected ? 'default' : isConnecting ? 'secondary' : 'destructive'}
            >
              {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
            </Badge>
            {error && (
              <span className="text-sm text-red-600">Error: {error}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              placeholder="Enter task title..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateTask()}
              className="max-w-sm"
            />
            <Button 
              onClick={handleCreateTask}
              disabled={!isConnected || !newTaskTitle.trim()}
            >
              Create Task
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Features Demo */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Live Task List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Live Task Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LiveTaskList projectId={projectId} />
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Real-time Features:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Open this page in multiple browser tabs</li>
                <li>• Create tasks and see them appear instantly</li>
                <li>• Update task status and see live changes</li>
                <li>• Watch presence indicators update</li>
                <li>• Receive real-time notifications</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">What's Working:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✅ WebSocket connection</li>
                <li>✅ Live task updates</li>
                <li>✅ Presence indicators</li>
                <li>✅ Real-time notifications</li>
                <li>✅ Multi-user collaboration</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Notifications */}
      <NotificationToast />
    </div>
  )
}
