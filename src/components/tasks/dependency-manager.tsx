"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ArrowRight, 
  ArrowDown, 
  Link as LinkIcon,
  Unlink,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Calendar,
  Loader2
} from "lucide-react"

interface Task {
  id: string
  title: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  assignee?: {
    id: string
    name: string
    email: string
  }
}

interface TaskDependencies {
  task: {
    id: string
    title: string
    status: string
    project: {
      id: string
      name: string
    }
  }
  dependencies: Task[]
  blockedTasks: Task[]
}

interface DependencyManagerProps {
  taskId: string
  projectId: string
  isOpen: boolean
  onClose: () => void
  onDependenciesUpdated?: () => void
}

export function DependencyManager({ 
  taskId, 
  projectId, 
  isOpen, 
  onClose, 
  onDependenciesUpdated 
}: DependencyManagerProps) {
  const [dependencies, setDependencies] = useState<TaskDependencies | null>(null)
  const [availableTasks, setAvailableTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedDependency, setSelectedDependency] = useState<string>("")
  const [selectedBlocked, setSelectedBlocked] = useState<string>("")

  // Load dependencies and available tasks
  useEffect(() => {
    if (isOpen && taskId) {
      loadDependencies()
      loadAvailableTasks()
    }
  }, [isOpen, taskId, projectId])

  const loadDependencies = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/dependencies`)
      if (response.ok) {
        const data = await response.json()
        setDependencies(data)
      }
    } catch (error) {
      console.error('Error loading dependencies:', error)
    }
  }

  const loadAvailableTasks = async () => {
    try {
      const response = await fetch(`/api/tasks?projectId=${projectId}&workspaceId=workspace-1`)
      if (response.ok) {
        const data = await response.json()
        // Filter out the current task
        const filtered = data.filter((task: Task) => task.id !== taskId)
        setAvailableTasks(filtered)
      }
    } catch (error) {
      console.error('Error loading available tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addDependency = async (dependsOnId: string) => {
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/tasks/${taskId}/dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dependsOn: [dependsOnId],
          action: 'add'
        }),
      })

      if (response.ok) {
        await loadDependencies()
        onDependenciesUpdated?.()
        setSelectedDependency("")
      } else {
        const error = await response.json()
        console.error('Error adding dependency:', error)
      }
    } catch (error) {
      console.error('Error adding dependency:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const removeDependency = async (dependsOnId: string) => {
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/tasks/${taskId}/dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dependsOn: [dependsOnId],
          action: 'remove'
        }),
      })

      if (response.ok) {
        await loadDependencies()
        onDependenciesUpdated?.()
      } else {
        const error = await response.json()
        console.error('Error removing dependency:', error)
      }
    } catch (error) {
      console.error('Error removing dependency:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const addBlockedTask = async (blockedId: string) => {
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/tasks/${taskId}/dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blocks: [blockedId],
          action: 'add'
        }),
      })

      if (response.ok) {
        await loadDependencies()
        onDependenciesUpdated?.()
        setSelectedBlocked("")
      } else {
        const error = await response.json()
        console.error('Error adding blocked task:', error)
      }
    } catch (error) {
      console.error('Error adding blocked task:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const removeBlockedTask = async (blockedId: string) => {
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/tasks/${taskId}/dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blocks: [blockedId],
          action: 'remove'
        }),
      })

      if (response.ok) {
        await loadDependencies()
        onDependenciesUpdated?.()
      } else {
        const error = await response.json()
        console.error('Error removing blocked task:', error)
      }
    } catch (error) {
      console.error('Error removing blocked task:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DONE':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'BLOCKED':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800'
      case 'LOW':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Task Dependencies</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Task Dependencies</DialogTitle>
          <DialogDescription>
            Manage task dependencies and blocking relationships
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full overflow-y-auto">
          {dependencies && (
            <>
              {/* Current Task */}
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" />
                    Current Task
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(dependencies.task.status)}
                    <span className="font-medium">{dependencies.task.title}</span>
                    <Badge variant="outline">{dependencies.task.status}</Badge>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dependencies */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowRight className="h-5 w-5" />
                      Depends On
                    </CardTitle>
                    <CardDescription>
                      Tasks that must be completed before this task
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Add Dependency */}
                    <div className="flex gap-2">
                      <Select value={selectedDependency} onValueChange={setSelectedDependency}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select task to depend on" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTasks
                            .filter(task => !dependencies.dependencies.some(dep => dep.id === task.id))
                            .map((task) => (
                              <SelectItem key={task.id} value={task.id}>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(task.status)}
                                  <span>{task.title}</span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        size="sm" 
                        onClick={() => addDependency(selectedDependency)}
                        disabled={!selectedDependency || isUpdating}
                      >
                        Add
                      </Button>
                    </div>

                    {/* Dependencies List */}
                    <div className="space-y-2">
                      {dependencies.dependencies.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(task.status)}
                            <span className="font-medium">{task.title}</span>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeDependency(task.id)}
                            disabled={isUpdating}
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {dependencies.dependencies.length === 0 && (
                        <p className="text-muted-foreground text-sm">No dependencies</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Blocked Tasks */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowDown className="h-5 w-5" />
                      Blocks
                    </CardTitle>
                    <CardDescription>
                      Tasks that are blocked by this task
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Add Blocked Task */}
                    <div className="flex gap-2">
                      <Select value={selectedBlocked} onValueChange={setSelectedBlocked}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select task to block" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTasks
                            .filter(task => !dependencies.blockedTasks.some(blocked => blocked.id === task.id))
                            .map((task) => (
                              <SelectItem key={task.id} value={task.id}>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(task.status)}
                                  <span>{task.title}</span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        size="sm" 
                        onClick={() => addBlockedTask(selectedBlocked)}
                        disabled={!selectedBlocked || isUpdating}
                      >
                        Add
                      </Button>
                    </div>

                    {/* Blocked Tasks List */}
                    <div className="space-y-2">
                      {dependencies.blockedTasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(task.status)}
                            <span className="font-medium">{task.title}</span>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeBlockedTask(task.id)}
                            disabled={isUpdating}
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {dependencies.blockedTasks.length === 0 && (
                        <p className="text-muted-foreground text-sm">No blocked tasks</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
