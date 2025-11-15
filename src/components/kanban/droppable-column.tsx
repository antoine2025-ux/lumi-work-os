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

  // Get column width based on view density and screen size
  const getColumnWidth = () => {
    return 'w-full'
  }

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[400px] ${getColumnWidth()} ${
        isOver 
          ? 'bg-accent/20 border-2 border-accent border-dashed rounded-lg' 
          : ''
      }`}
    >
      <div className="space-y-3">
        {/* Simple Column Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">{column.title}</h4>
          <Badge variant="outline" className="text-xs border-border text-muted-foreground">
            {tasks.length}
          </Badge>
        </div>

        {/* Tasks */}
        <div className="space-y-2 min-h-[200px]">
          {tasks.map((task) => (
            <DraggableTaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onManageDependencies={onManageDependencies}
              compact={false}
            />
          ))}

          {/* Add Task Button */}
          {tasks.length === 0 && (
            <button
              onClick={() => onAddTask?.(column.status)}
              className="w-full p-2 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Add task</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
