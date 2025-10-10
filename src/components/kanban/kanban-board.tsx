"use client"

import React, { useState, useEffect } from 'react'
import { DragDropProvider } from './drag-drop-provider'
import { DroppableColumn } from './droppable-column'
import { TaskEditDialog } from '../tasks/task-edit-dialog'
import { DependencyManager } from '../tasks/dependency-manager'

interface Task {
  id: string
  title: string
  description: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  assigneeId?: string
  assignee?: {
    id: string
    name: string
    email: string
  }
  dueDate?: string
  tags: string[]
  dependsOn: string[]
  blocks: string[]
  createdAt: string
  updatedAt: string
  createdBy: {
    id: string
    name: string
    email: string
  }
  project: {
    id: string
    name: string
  }
  _count: {
    subtasks: number
    comments: number
  }
}

interface KanbanBoardProps {
  projectId: string
  workspaceId?: string
  onTasksUpdated?: () => void
  filteredTasks?: any[]
}

const columns = [
  { id: 'todo', status: 'TODO' as const, title: 'To Do', color: 'bg-gray-100 text-gray-800' },
  { id: 'in-progress', status: 'IN_PROGRESS' as const, title: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { id: 'in-review', status: 'IN_REVIEW' as const, title: 'In Review', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'done', status: 'DONE' as const, title: 'Done', color: 'bg-green-100 text-green-800' },
  { id: 'blocked', status: 'BLOCKED' as const, title: 'Blocked', color: 'bg-red-100 text-red-800' },
]

export function KanbanBoard({ projectId, workspaceId = 'workspace-1', onTasksUpdated, filteredTasks }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [dependencyTaskId, setDependencyTaskId] = useState<string | null>(null)
  const [isDependencyManagerOpen, setIsDependencyManagerOpen] = useState(false)

  useEffect(() => {
    loadTasks()
  }, [projectId, workspaceId])

  const loadTasks = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/tasks?projectId=${projectId}&workspaceId=${workspaceId}`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      } else {
        console.error('Failed to load tasks:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTaskMove = async (taskId: string, newStatus: string, newOrder?: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Update local state optimistically
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === taskId ? { ...task, status: newStatus as any } : task
          )
        )
        // Notify parent component that tasks were updated
        onTasksUpdated?.()
      } else {
        console.error('Task move failed:', response.status, response.statusText)
        // Reload tasks if update failed
        loadTasks()
      }
    } catch (error) {
      console.error('Error moving task:', error)
      loadTasks()
    }
  }

  const handleTaskReorder = async (taskId: string, newOrder: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order: newOrder }),
      })

      if (response.ok) {
        // Reload tasks to get updated order
        loadTasks()
      }
    } catch (error) {
      console.error('Error reordering task:', error)
    }
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setIsEditDialogOpen(true)
  }

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === updatedTask.id ? updatedTask : task
      )
    )
    // Notify parent component that tasks were updated
    onTasksUpdated?.()
  }

  const handleManageDependencies = (taskId: string) => {
    setDependencyTaskId(taskId)
    setIsDependencyManagerOpen(true)
  }

  const handleDependenciesUpdated = () => {
    loadTasks() // Reload tasks to get updated dependency info
    // Notify parent component that tasks were updated
    onTasksUpdated?.()
  }

  const handleAddTask = (status: string) => {
    // Navigate to the new task page with the status pre-filled
    window.location.href = `/projects/${projectId}/tasks/new?status=${status}`
  }

  // Use filtered tasks if provided, otherwise use loaded tasks
  // Ensure filtered tasks have project information and dependsOn array
  const displayTasks = filteredTasks ? 
    filteredTasks.map(task => ({
      ...task,
      project: task.project || { id: projectId },
      dependsOn: task.dependsOn || []
    })) : 
    tasks

  const getTasksForColumn = (status: string) => {
    return displayTasks.filter(task => task.status === status)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <DragDropProvider
      onTaskMove={handleTaskMove}
      onTaskReorder={handleTaskReorder}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 p-6">
        {columns.map((column) => (
          <DroppableColumn
            key={column.id}
            column={column}
            tasks={getTasksForColumn(column.status)}
            onEditTask={handleEditTask}
            onManageDependencies={handleManageDependencies}
            onAddTask={handleAddTask}
          />
        ))}
      </div>

      {/* Task Edit Dialog */}
      <TaskEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        task={editingTask}
        onSave={handleTaskUpdate}
      />

      {/* Dependency Manager */}
      {dependencyTaskId && (
        <DependencyManager
          taskId={dependencyTaskId}
          projectId={projectId}
          isOpen={isDependencyManagerOpen}
          onClose={() => setIsDependencyManagerOpen(false)}
          onDependenciesUpdated={handleDependenciesUpdated}
        />
      )}
    </DragDropProvider>
  )
}
