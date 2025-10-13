'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, Circle, Clock, Edit2, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskListProps {
  tasks: Array<{
    id: string
    title: string
    description?: string | null
    status: 'PENDING' | 'IN_PROGRESS' | 'DONE'
    dueDate?: string | null
    order: number
  }>
  onTaskUpdate?: (taskId: string, updates: { status?: string; title?: string; description?: string }) => Promise<void>
  readonly?: boolean
}

export function TaskList({ tasks, onTaskUpdate, readonly = false }: TaskListProps) {
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const getTaskIcon = (status: string) => {
    switch (status) {
      case 'DONE':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'IN_PROGRESS':
        return <Clock className="h-5 w-5 text-blue-600" />
      default:
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (onTaskUpdate) {
      await onTaskUpdate(taskId, { status: newStatus })
    }
  }

  const handleEditStart = (task: any) => {
    setEditingTask(task.id)
    setEditTitle(task.title)
    setEditDescription(task.description || '')
  }

  const handleEditSave = async (taskId: string) => {
    if (onTaskUpdate) {
      await onTaskUpdate(taskId, { 
        title: editTitle,
        description: editDescription 
      })
    }
    setEditingTask(null)
  }

  const handleEditCancel = () => {
    setEditingTask(null)
    setEditTitle('')
    setEditDescription('')
  }

  const sortedTasks = [...tasks].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-3">
      {sortedTasks.map((task) => (
        <div key={task.id} className="flex items-start gap-3 p-3 border rounded-lg">
          <div className="flex-shrink-0 mt-1">
            {readonly ? (
              getTaskIcon(task.status)
            ) : (
              <Checkbox
                checked={task.status === 'DONE'}
                onCheckedChange={(checked) => {
                  const newStatus = checked ? 'DONE' : 'PENDING'
                  handleStatusChange(task.id, newStatus)
                }}
                disabled={task.status === 'IN_PROGRESS'}
              />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            {editingTask === task.id ? (
              <div className="space-y-2">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Task title"
                  className="font-medium"
                />
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Task description"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleEditSave(task.id)}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleEditCancel}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className={cn(
                    'font-medium',
                    task.status === 'DONE' && 'line-through text-muted-foreground'
                  )}>
                    {task.title}
                  </h4>
                  {!readonly && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditStart(task)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {task.description && (
                  <p className={cn(
                    'text-sm text-muted-foreground',
                    task.status === 'DONE' && 'line-through'
                  )}>
                    {task.description}
                  </p>
                )}
                {task.dueDate && (
                  <p className="text-xs text-muted-foreground">
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>
          
          {!readonly && task.status !== 'DONE' && (
            <div className="flex-shrink-0">
              <Button
                size="sm"
                variant={task.status === 'IN_PROGRESS' ? 'default' : 'outline'}
                onClick={() => {
                  const newStatus = task.status === 'IN_PROGRESS' ? 'PENDING' : 'IN_PROGRESS'
                  handleStatusChange(task.id, newStatus)
                }}
              >
                {task.status === 'IN_PROGRESS' ? 'In Progress' : 'Start'}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
