"use client"

import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { ContextMenu } from '@/components/ui/context-menu'
import { Edit, LinkIcon } from 'lucide-react'
import Link from 'next/link'

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
      action: () => onEdit?.(task)
    },
    {
      id: "dependencies",
      label: "Manage Dependencies",
      icon: LinkIcon,
      action: () => onManageDependencies?.(task.id)
    }
  ]

  return (
    <ContextMenu items={menuItems}>
      <Card
        ref={setNodeRef}
        style={style}
        className={`hover-lift drag-transition border-0 shadow-sm ${
          isDragging 
            ? 'shadow-lg border border-blue-300' 
            : 'hover:scale-[1.02] hover:border-gray-200'
        } ${compact ? 'text-xs' : ''}`}
      >
        <CardContent className={compact ? "p-2" : "p-4"}>
          <div className={`space-y-${compact ? '1' : '3'}`}>
            {/* Title - Clickable Link */}
            <Link 
              href={`/projects/${task.project.id}/tasks/${task.id}`}
              className="block hover:bg-gray-50 rounded p-1 -m-1 transition-colors"
              onClick={(e) => {
                // Prevent navigation if dragging
                if (isDragging) {
                  e.preventDefault()
                }
              }}
              onContextMenu={(e) => {
                // Allow context menu to work on the link
                e.stopPropagation()
              }}
            >
              <h3 className={`font-medium leading-tight text-gray-900 cursor-pointer ${
                compact ? 'text-xs' : 'text-base'
              }`}>{task.title}</h3>
            </Link>

            {/* Description - Minimal */}
            {task.description && !compact && (
              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{task.description}</p>
            )}

            {/* Essential Info - Horizontal Layout */}
            <div className={`flex items-center justify-between text-xs text-gray-400 ${
              compact ? 'space-x-1' : 'space-x-3'
            }`}>
              <div className={`flex items-center ${compact ? 'space-x-1' : 'space-x-3'}`}>
                {/* Priority - Enhanced Dot */}
                <div className={`${compact ? 'w-2 h-2' : 'w-3 h-3'} rounded-full shadow-sm ${
                  task.priority === 'URGENT' ? 'bg-red-500 ring-2 ring-red-200' :
                  task.priority === 'HIGH' ? 'bg-orange-500 ring-2 ring-orange-200' :
                  task.priority === 'MEDIUM' ? 'bg-yellow-500 ring-2 ring-yellow-200' : 'bg-green-500 ring-2 ring-green-200'
                }`} />
                
                {/* Assignee - Enhanced */}
                {task.assignee && task.assignee.name && !compact && (
                  <span className="text-gray-600 font-medium">{task.assignee.name}</span>
                )}
              </div>

              {/* Due Date - Enhanced */}
              {task.dueDate && (
                <span className={`text-xs font-medium ${compact ? 'px-1 py-0.5' : 'px-2 py-1'} rounded-full ${
                  new Date(task.dueDate) < new Date() 
                    ? 'text-red-600 bg-red-50 border border-red-200' 
                    : 'text-gray-500 bg-gray-50 border border-gray-200'
                }`}>
                  {compact 
                    ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
                    : new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }
                </span>
              )}
            </div>

            {/* Dependencies - Enhanced */}
            {task.dependsOn && task.dependsOn.length > 0 && !compact && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full ring-1 ring-blue-200" />
                <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full border border-blue-200">
                  {task.dependsOn.length} dependency{task.dependsOn.length > 1 ? 'ies' : ''}
                </span>
              </div>
            )}

            {/* Drag Handle - Small area for dragging */}
            <div 
              className="flex justify-end mt-2"
              {...attributes}
              {...listeners}
            >
              <div className="w-6 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-30 hover:opacity-60 transition-opacity">
                <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                  <div className="w-1 h-1 bg-gray-400 rounded-sm"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-sm"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-sm"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-sm"></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </ContextMenu>
  )
}
