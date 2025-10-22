"use client"

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { DraggableTaskCard } from './draggable-task-card'

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

interface Column {
  id: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
  title: string
  color: string
}

interface DroppableColumnProps {
  column: Column
  tasks: Task[]
  onEditTask?: (task: Task) => void
  onManageDependencies?: (taskId: string) => void
  onAddTask?: (status: string) => void
  viewDensity?: 'compact' | 'comfortable' | 'spacious'
  screenSize?: 'desktop' | 'tablet' | 'mobile'
  epicId?: string
}

export function DroppableColumn({ 
  column, 
  tasks, 
  onEditTask,
  onManageDependencies,
  onAddTask,
  viewDensity = 'comfortable',
  screenSize = 'desktop',
  epicId
}: DroppableColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: column.id,
    data: {
      column: column,
      type: 'column'
    }
  })

  // Determine if we should use multi-column layout
  const shouldUseMultiColumn = () => {
    // Disable multi-column layout for now to prevent overlapping
    return false
    
    // Original logic (commented out):
    // if (screenSize === 'mobile') return false
    // if (tasks.length < 5) return false
    // if (viewDensity === 'compact') return true
    // if (viewDensity === 'comfortable' && tasks.length > 8) return true
    // if (viewDensity === 'spacious' && tasks.length > 12) return true
    // return false
  }

  // Get column width based on view density and screen size
  const getColumnWidth = () => {
    // Remove fixed width constraints since we're using CSS Grid auto-fit
    return 'w-full'
  }

  // Split tasks into rows for multi-column layout
  const getTaskRows = () => {
    if (!shouldUseMultiColumn()) {
      return [tasks] // Single column
    }
    
    const tasksPerRow = viewDensity === 'compact' ? 2 : 2
    const rows = []
    for (let i = 0; i < tasks.length; i += tasksPerRow) {
      rows.push(tasks.slice(i, i + tasksPerRow))
    }
    return rows
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO':
        return 'bg-gray-100 text-gray-800'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800'
      case 'IN_REVIEW':
        return 'bg-yellow-100 text-yellow-800'
      case 'DONE':
        return 'bg-green-100 text-green-800'
      case 'BLOCKED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getColumnTitleStyle = (status: string) => {
    switch (status) {
      case 'TODO':
        return 'text-gray-700 dark:text-gray-300 font-medium'
      case 'IN_PROGRESS':
        return 'text-blue-700 dark:text-blue-300 font-medium'
      case 'IN_REVIEW':
        return 'text-yellow-700 dark:text-yellow-300 font-medium'
      case 'DONE':
        return 'text-green-700 dark:text-green-300 font-medium'
      case 'BLOCKED':
        return 'text-red-700 dark:text-red-300 font-medium'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getTaskCountBadgeStyle = (status: string, count: number) => {
    switch (status) {
      case 'TODO':
        return count > 0 
          ? 'text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600' 
          : 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800'
      case 'IN_PROGRESS':
        return count > 0 
          ? 'text-blue-700 dark:text-blue-300 bg-blue-200 dark:bg-blue-900 border border-blue-300 dark:border-blue-700' 
          : 'text-blue-400 dark:text-blue-500 bg-blue-50 dark:bg-blue-900/50'
      case 'IN_REVIEW':
        return count > 0 
          ? 'text-yellow-700 dark:text-yellow-300 bg-yellow-200 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700' 
          : 'text-yellow-400 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/50'
      case 'DONE':
        return count > 0 
          ? 'text-green-700 dark:text-green-300 bg-green-200 dark:bg-green-900 border border-green-300 dark:border-green-700' 
          : 'text-green-400 dark:text-green-500 bg-green-50 dark:bg-green-900/50'
      case 'BLOCKED':
        return count > 0 
          ? 'text-red-700 dark:text-red-300 bg-red-200 dark:bg-red-900 border border-red-300 dark:border-red-700' 
          : 'text-red-400 dark:text-red-500 bg-red-50 dark:bg-red-900/50'
      default:
        return 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800'
    }
  }

  const getColumnBackgroundStyle = (status: string) => {
    switch (status) {
      case 'TODO':
        return 'hover:bg-muted/50'
      case 'IN_PROGRESS':
        return 'hover:bg-accent/30'
      case 'IN_REVIEW':
        return 'hover:bg-accent/30'
      case 'DONE':
        return 'hover:bg-accent/30'
      case 'BLOCKED':
        return 'hover:bg-accent/30'
      default:
        return 'hover:bg-muted/50'
    }
  }

  const getColumnCardStyle = (status: string) => {
    switch (status) {
      case 'TODO':
        return 'hover:shadow-md hover:scale-[1.01] bg-card'
      case 'IN_PROGRESS':
        return 'hover:shadow-md hover:scale-[1.01] bg-card border-l-4 border-l-blue-400'
      case 'IN_REVIEW':
        return 'hover:shadow-md hover:scale-[1.01] bg-card border-l-4 border-l-yellow-400'
      case 'DONE':
        return 'hover:shadow-md hover:scale-[1.01] bg-card border-l-4 border-l-green-400'
      case 'BLOCKED':
        return 'hover:shadow-md hover:scale-[1.01] bg-card border-l-4 border-l-red-400'
      default:
        return 'hover:shadow-md hover:scale-[1.01] bg-card'
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[600px] drag-transition-slow ${getColumnWidth()} ${
        isOver 
          ? 'bg-gradient-to-b from-accent to-accent/60 border-2 border-accent border-dashed rounded-xl shadow-lg drop-zone-glow' 
          : getColumnBackgroundStyle(column.status)
      }`}
    >
      <Card className={`h-full drag-transition-slow border-0 shadow-sm ${
        isOver 
          ? 'ring-4 ring-accent/30 shadow-xl scale-[1.02] bg-card/95 column-highlight' 
          : getColumnCardStyle(column.status)
      }`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className={`text-sm font-light transition-colors duration-300 ${
                isOver 
                  ? 'text-blue-700 font-medium' 
                  : getColumnTitleStyle(column.status)
              }`}>
                {column.title}
              </CardTitle>
              <span className={`text-xs rounded-full px-2 py-1 transition-all duration-300 font-medium ${
                isOver 
                  ? 'text-blue-700 bg-blue-200' 
                  : getTaskCountBadgeStyle(column.status, tasks.length)
              }`}>
                {tasks.length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddTask?.(column.status)}
              className="h-5 w-5 p-0 opacity-60 hover:opacity-100"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {tasks.length === 0 ? (
            <div className={`text-center py-8 transition-all duration-300 ${
              isOver 
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-600' 
                : 'text-gray-400 dark:text-gray-500'
            }`}>
              <div className={`mb-3 transition-colors duration-300 ${
                isOver ? 'text-blue-700 dark:text-blue-300 font-medium' : ''
              }`}>
                {isOver ? 'Drop task here' : 'No tasks'}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddTask?.(column.status)}
                className={`text-xs h-7 px-3 transition-all duration-300 ${
                  isOver 
                    ? 'border-blue-400 text-blue-600 hover:bg-blue-100' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Add Task
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {getTaskRows().map((row, rowIndex) => (
                <div 
                  key={rowIndex} 
                  className={`${
                    shouldUseMultiColumn() 
                      ? 'grid grid-cols-2 gap-2' 
                      : 'space-y-3'
                  }`}
                >
                  {row.map((task, taskIndex) => (
                    <div 
                      key={task.id} 
                      className="task-slide-in" 
                      style={{ 
                        animationDelay: `${(rowIndex * 2 + taskIndex) * 0.1}s`,
                        ...(shouldUseMultiColumn() && viewDensity === 'compact' ? {
                          transform: 'scale(0.95)'
                        } : {})
                      }}
                    >
                      <DraggableTaskCard
                        task={task}
                        onEdit={onEditTask}
                        onManageDependencies={onManageDependencies}
                        compact={shouldUseMultiColumn() && viewDensity === 'compact'}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
