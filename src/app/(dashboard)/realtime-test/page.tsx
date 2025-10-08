'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useSocket } from '@/lib/realtime/socket-context'
import { ArrowLeft, Plus, Users, Zap, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function RealtimeTestPage() {
  const { socket, isConnected, isConnecting, error, connect } = useSocket()
  const [messages, setMessages] = useState<string[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [activeUsers, setActiveUsers] = useState<Array<{ userId: string; userName: string }>>([])

  // Connect with demo user
  useEffect(() => {
    if (!socket && !isConnecting) {
      connect('demo-user-1', 'Demo User', 'workspace-1')
    }
  }, [socket, isConnecting, connect])

  // Listen for real-time events
  useEffect(() => {
    if (!socket) return

    const handleUserJoined = (data: { userId: string; userName: string }) => {
      setMessages(prev => [...prev, `${data.userName} joined the workspace`])
      setActiveUsers(prev => {
        const exists = prev.find(user => user.userId === data.userId)
        if (exists) return prev
        return [...prev, { userId: data.userId, userName: data.userName }]
      })
    }

    const handleUserLeft = (data: { userId: string }) => {
      setMessages(prev => [...prev, `User ${data.userId} left the workspace`])
      setActiveUsers(prev => prev.filter(user => user.userId !== data.userId))
    }

    const handleTaskUpdated = (data: { taskId: string; updates: any; userId: string }) => {
      setMessages(prev => [...prev, `Task ${data.taskId} was updated by ${data.userId}`])
    }

    const handleNotification = (data: { type: string; message: string }) => {
      setMessages(prev => [...prev, `Notification: ${data.message}`])
    }

    socket.on('userJoined', handleUserJoined)
    socket.on('userLeft', handleUserLeft)
    socket.on('taskUpdated', handleTaskUpdated)
    socket.on('notification', handleNotification)

    return () => {
      socket.off('userJoined', handleUserJoined)
      socket.off('userLeft', handleUserLeft)
      socket.off('taskUpdated', handleTaskUpdated)
      socket.off('notification', handleNotification)
    }
  }, [socket])

  const sendTestMessage = () => {
    if (!socket || !newMessage.trim()) return
    
    socket.emit('sendNotification', {
      type: 'test',
      message: newMessage
    })
    setNewMessage('')
  }

  const simulateTaskUpdate = () => {
    if (!socket) return
    
    socket.emit('updateTask', {
      taskId: 'demo-task-1',
      updates: { status: 'IN_PROGRESS' }
    })
  }

  const joinProject = () => {
    if (!socket) return
    
    socket.emit('joinProject', 'demo-project-1')
    setMessages(prev => [...prev, 'Joined demo project'])
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Real-time Test</h1>
            <p className="text-muted-foreground">
              Test real-time collaboration features
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge 
            variant={isConnected ? 'default' : isConnecting ? 'secondary' : 'destructive'}
          >
            {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
          </Badge>
          {error && (
            <span className="text-sm text-red-600">Error: {error}</span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className={`h-4 w-4 ${isConnected ? 'text-green-500' : 'text-gray-400'}`} />
                <span>WebSocket Connection</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className={`h-4 w-4 ${activeUsers.length > 0 ? 'text-green-500' : 'text-gray-400'}`} />
                <span>Active Users: {activeUsers.length}</span>
              </div>
            </div>
            
            {activeUsers.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Online Users:</h4>
                <div className="space-y-1">
                  {activeUsers.map((user) => (
                    <div key={user.userId} className="text-sm text-muted-foreground">
                      • {user.userName} ({user.userId})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Test Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Enter test message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendTestMessage()}
              />
              <Button 
                onClick={sendTestMessage}
                disabled={!isConnected || !newMessage.trim()}
              >
                Send
              </Button>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={simulateTaskUpdate}
                disabled={!isConnected}
                className="w-full"
              >
                Simulate Task Update
              </Button>
              
              <Button 
                onClick={joinProject}
                disabled={!isConnected}
                variant="outline"
                className="w-full"
              >
                Join Demo Project
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Live Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 overflow-y-auto space-y-2">
            {messages.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No messages yet. Open this page in another tab to see real-time updates!
              </p>
            ) : (
              messages.map((message, index) => (
                <div key={index} className="p-2 bg-muted rounded text-sm">
                  {message}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>1. Open this page in multiple browser tabs</p>
            <p>2. Send messages and see them appear in all tabs</p>
            <p>3. Simulate task updates and watch real-time notifications</p>
            <p>4. Join the demo project to test project-specific features</p>
            <p>5. Check the browser console for detailed WebSocket logs</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
