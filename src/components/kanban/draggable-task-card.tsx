"use client"

import React, { useRef, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { ContextMenu } from '@/components/ui/context-menu'
import { Badge } from '@/components/ui/badge'
import { Edit, LinkIcon, User, AlertCircle } from 'lucide-react'
import { getEpicColor } from '@/lib/utils/epic-colors'
import { useTaskSidebarStore } from '@/lib/stores/use-task-sidebar-store'
import { cn } from '@/lib/utils'

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
  isOverlay?: boolean // When true, this card is rendered in DragOverlay (no drag handlers)
}

export function DraggableTaskCard({ 
  task,
  onEdit,
  onManageDependencies,
  compact = false,
  isOverlay = false
}: DraggableTaskCardProps) {
  const { open } = useTaskSidebarStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = React.useState<{ width: number; height: number } | null>(null)
  
  // Only use draggable hooks when NOT in overlay mode
  // In overlay mode, this is just a visual representation
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
    },
    disabled: isOverlay, // Disable drag when in overlay
  })

  // Capture dimensions when drag starts to lock them and prevent stretching
  useEffect(() => {
    if (!isOverlay && isDragging && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDimensions({ width: rect.width, height: rect.height })
    } else if (!isDragging) {
      setDimensions(null)
    }
  }, [isDragging, isOverlay])

  // Style for the draggable root element - keep it simple to avoid drag ghost stretching
  // We avoid transitions on transform/scale here because DnD applies its own transforms
  const style = isOverlay ? {} : {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    // Lock dimensions during drag to prevent stretching
    ...(isDragging && dimensions ? {
      width: `${dimensions.width}px`,
      height: `${dimensions.height}px`,
      minWidth: `${dimensions.width}px`,
      maxWidth: `${dimensions.width}px`,
      minHeight: `${dimensions.height}px`,
      maxHeight: `${dimensions.height}px`,
    } : {}),
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

  // When in overlay mode, render without drag handlers and with enhanced visual feedback
  // Lock width to prevent stretching when dragging downward
  // The card should be the same size as the original, just with a stronger shadow
  if (isOverlay) {
    return (
      <Card
        style={{
          borderLeftWidth: '4px',
          borderLeftColor: epicColor,
        }}
        className={cn(
          "border-border bg-card shadow-2xl w-full",
          // Constrain width to prevent stretching - w-full ensures it matches column width
        )}
      >
          <div className="transition-colors">
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
          </div>
        </Card>
    )
  }

  return (
    <ContextMenu items={menuItems}>
      {/* 
        Draggable root: Keep this element simple with no transforms/transitions.
        The DnD library applies its own transform, and any transition: 'all' or 
        transform/scale classes here can cause the drag ghost to stretch abnormally.
        Height is determined by content, not forced via flex-1 or h-full.
        Critical: When @dnd-kit clones this element for the drag preview, it preserves
        computed styles. We must ensure NO height constraints, flex-grow, or transforms
        that could cause the cloned element to stretch when positioned absolutely.
      */}
      <div
        ref={(node) => {
          setNodeRef(node)
          containerRef.current = node
        }}
        style={style}
        className={`w-full flex-shrink-0 ${
          isDragging 
            ? 'opacity-50 shadow-lg ring-2 ring-primary/20 z-20' 
            : ''
        }`}
        {...attributes}
        {...listeners}
      >
        <Card
          style={{
            borderLeftWidth: '4px',
            borderLeftColor: epicColor,
          }}
          className="w-full border-border bg-card cursor-pointer"
          onClick={(e) => {
            // Allow clicking to open sidebar, but prevent navigation if dragging
            if (!isDragging) {
              open(task.id)
            }
          }}
        >
        {/* 
          Inner wrapper: Hover effects and transitions go here, not on the draggable root.
          When dragging, we explicitly disable scale to prevent visual issues.
        */}
        <div
          className={`transition-colors ${
            isDragging 
              ? '' 
              : 'hover:bg-muted/50'
          }`}
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
        </div>
        </Card>
      </div>
    </ContextMenu>
  )
}
