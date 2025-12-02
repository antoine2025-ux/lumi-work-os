"use client"

import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { ContextMenu } from '@/components/ui/context-menu'
import { Badge } from '@/components/ui/badge'
import { Edit, LinkIcon, User, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { getEpicColor } from '@/lib/utils/epic-colors'
import { useTaskSidebarStore } from '@/lib/stores/use-task-sidebar-store'

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
  epicId?: string
  epic?: {
    id: string
    title: string
    color?: string
  }
  milestoneId?: string
  milestone?: {
    id: string
    title: string
    startDate?: string
    endDate?: string
  }
  points?: number
  customFields?: {
    id: string
    fieldId: string
    value: any
    field: {
      id: string
      label: string
      type: string
    }
  }[]
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

interface DraggableTaskCardProps {
  task: Task
  onEdit?: (task: Task) => void
  onManageDependencies?: (taskId: string) => void
  compact?: boolean
}

export function DraggableTaskCard({ 
  task,
  onEdit,
  onManageDependencies,
  compact = false
}: DraggableTaskCardProps) {
  const { open } = useTaskSidebarStore()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ 
    id: task.id,
    data: {
      task,
      type: 'task'
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 1000 : 1,
    transition: isDragging ? 'none' : 'all 0.2s ease-in-out',
  }


  // Create context menu items for this task
  const menuItems = [
    {
      id: "edit",
      label: "Edit Task",
      icon: Edit,
      action: () => open(task.id)
    },
    {
      id: "dependencies",
      label: "Manage Dependencies",
      icon: LinkIcon,
      action: () => onManageDependencies?.(task.id)
    }
  ]

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
      case "HIGH":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "MEDIUM":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    }
  }

  // Get epic color for left border and pill
  const epicColor = getEpicColor(task.epic)
  const hasEpic = task.epic && task.epic.title

  return (
    <ContextMenu items={menuItems}>
      <Card
        ref={setNodeRef}
        style={{
          ...style,
          borderLeftWidth: '4px',
          borderLeftColor: epicColor,
        }}
        className={`border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer ${
          isDragging ? 'opacity-50' : ''
        }`}
        {...attributes}
        {...listeners}
        onClick={(e) => {
          // Allow clicking to open sidebar, but prevent navigation if dragging
          if (!isDragging) {
            open(task.id)
          }
        }}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-2 mb-2">
            {task.status === 'BLOCKED' && (
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <p className={`text-sm text-foreground flex-1 ${task.status === 'BLOCKED' ? 'line-through opacity-70' : ''}`}>
              {task.title}
            </p>
          </div>
          
          {/* Epic Pill */}
          <div className="mb-2">
            <Badge
              variant="outline"
              className={`text-xs ${
                hasEpic
                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                  : 'bg-muted text-muted-foreground border-muted-foreground/20'
              }`}
              style={hasEpic && task.epic?.color ? {
                backgroundColor: `${task.epic.color}15`,
                color: task.epic.color,
                borderColor: `${task.epic.color}40`,
              } : undefined}
            >
              {hasEpic ? task.epic.title : 'No Epic'}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className={`text-xs ${getPriorityColor(task.priority)}`}
            >
              {task.priority}
            </Badge>
            {task.assignee && task.assignee.name && (
              <div className="flex items-center space-x-1">
                <User className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{task.assignee.name}</span>
              </div>
            )}
          </div>
          {task.dependsOn && task.dependsOn.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              Depends on {task.dependsOn.length} task{task.dependsOn.length > 1 ? 's' : ''}
            </div>
          )}
        </CardContent>
      </Card>
    </ContextMenu>
  )
}
