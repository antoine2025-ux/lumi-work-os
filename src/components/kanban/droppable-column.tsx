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
}

export function DroppableColumn({ 
  column, 
  tasks, 
  onEditTask,
  onManageDependencies,
  onAddTask 
}: DroppableColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: column.id,
    data: {
      column: column,
      type: 'column'
    }
  })

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
        return 'text-gray-700 font-medium'
      case 'IN_PROGRESS':
        return 'text-blue-700 font-medium'
      case 'IN_REVIEW':
        return 'text-yellow-700 font-medium'
      case 'DONE':
        return 'text-green-700 font-medium'
      case 'BLOCKED':
        return 'text-red-700 font-medium'
      default:
        return 'text-gray-600'
    }
  }

  const getTaskCountBadgeStyle = (status: string, count: number) => {
    switch (status) {
      case 'TODO':
        return count > 0 
          ? 'text-gray-700 bg-gray-200 border border-gray-300' 
          : 'text-gray-400 bg-gray-100'
      case 'IN_PROGRESS':
        return count > 0 
          ? 'text-blue-700 bg-blue-200 border border-blue-300' 
          : 'text-blue-400 bg-blue-50'
      case 'IN_REVIEW':
        return count > 0 
          ? 'text-yellow-700 bg-yellow-200 border border-yellow-300' 
          : 'text-yellow-400 bg-yellow-50'
      case 'DONE':
        return count > 0 
          ? 'text-green-700 bg-green-200 border border-green-300' 
          : 'text-green-400 bg-green-50'
      case 'BLOCKED':
        return count > 0 
          ? 'text-red-700 bg-red-200 border border-red-300' 
          : 'text-red-400 bg-red-50'
      default:
        return 'text-gray-400 bg-gray-100'
    }
  }

  const getColumnBackgroundStyle = (status: string) => {
    switch (status) {
      case 'TODO':
        return 'hover:bg-gray-50/50'
      case 'IN_PROGRESS':
        return 'hover:bg-blue-50/30'
      case 'IN_REVIEW':
        return 'hover:bg-yellow-50/30'
      case 'DONE':
        return 'hover:bg-green-50/30'
      case 'BLOCKED':
        return 'hover:bg-red-50/30'
      default:
        return 'hover:bg-gray-50/50'
    }
  }

  const getColumnCardStyle = (status: string) => {
    switch (status) {
      case 'TODO':
        return 'hover:shadow-md hover:scale-[1.01] bg-white'
      case 'IN_PROGRESS':
        return 'hover:shadow-md hover:scale-[1.01] bg-white border-l-4 border-l-blue-400'
      case 'IN_REVIEW':
        return 'hover:shadow-md hover:scale-[1.01] bg-white border-l-4 border-l-yellow-400'
      case 'DONE':
        return 'hover:shadow-md hover:scale-[1.01] bg-white border-l-4 border-l-green-400'
      case 'BLOCKED':
        return 'hover:shadow-md hover:scale-[1.01] bg-white border-l-4 border-l-red-400'
      default:
        return 'hover:shadow-md hover:scale-[1.01] bg-white'
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[400px] drag-transition-slow ${
        isOver 
          ? 'bg-gradient-to-b from-blue-50 to-blue-100 border-2 border-blue-400 border-dashed rounded-xl shadow-lg drop-zone-glow' 
          : getColumnBackgroundStyle(column.status)
      }`}
    >
      <Card className={`h-full drag-transition-slow border-0 shadow-sm ${
        isOver 
          ? 'ring-4 ring-blue-500/30 shadow-xl scale-[1.02] bg-white/95 column-highlight' 
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
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className={`text-center py-8 transition-all duration-300 ${
                isOver 
                  ? 'text-blue-600 bg-blue-50/50 rounded-lg border-2 border-dashed border-blue-300' 
                  : 'text-gray-400'
              }`}>
                <div className={`mb-3 transition-colors duration-300 ${
                  isOver ? 'text-blue-700 font-medium' : ''
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
              tasks.map((task, index) => (
                <div key={task.id} className="task-slide-in" style={{ animationDelay: `${index * 0.1}s` }}>
                  <DraggableTaskCard
                    task={task}
                    onEdit={onEditTask}
                    onManageDependencies={onManageDependencies}
                  />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
