"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Calendar, AlertCircle, UserCircle } from "lucide-react"

export interface Todo {
  id: string
  title: string
  note?: string | null
  status: 'OPEN' | 'DONE'
  dueAt?: string | null
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null
  anchorType: 'NONE' | 'PROJECT' | 'TASK' | 'PAGE'
  anchorId?: string | null
  createdAt: string
  updatedAt: string
  createdById?: string // For "assigned by" comparison
  assignedToId?: string // For comparison
  createdBy: {
    id: string
    name?: string | null
    email: string
    image?: string | null
  }
  assignedTo: {
    id: string
    name?: string | null
    email: string
    image?: string | null
  }
}

interface TodoItemProps {
  todo: Todo
  onToggle: (id: string, status: 'OPEN' | 'DONE') => void
  onClick?: (todo: Todo) => void
  showAssignee?: boolean
  compact?: boolean
  currentUserId?: string // To determine perspective for "assigned by/to" display
}

function getInitials(name?: string | null, email?: string): string {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  return email?.charAt(0).toUpperCase() || '?'
}

function getPriorityColor(priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null): string {
  switch (priority) {
    case 'HIGH':
      return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 'MEDIUM':
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    case 'LOW':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function formatDueDate(dueAt?: string | null): { label: string; isOverdue: boolean; isToday: boolean } {
  if (!dueAt) return { label: '', isOverdue: false, isToday: false }
  
  const due = new Date(dueAt)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  
  const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) {
    return { label: `${Math.abs(diffDays)}d overdue`, isOverdue: true, isToday: false }
  } else if (diffDays === 0) {
    return { label: 'Today', isOverdue: false, isToday: true }
  } else if (diffDays === 1) {
    return { label: 'Tomorrow', isOverdue: false, isToday: false }
  } else if (diffDays < 7) {
    return { label: due.toLocaleDateString('en-US', { weekday: 'short' }), isOverdue: false, isToday: false }
  } else {
    return { label: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), isOverdue: false, isToday: false }
  }
}

export function TodoItem({ 
  todo, 
  onToggle, 
  onClick,
  showAssignee = true,
  compact = false,
  currentUserId
}: TodoItemProps) {
  const [isToggling, setIsToggling] = useState(false)
  const dueInfo = formatDueDate(todo.dueAt)
  const isDone = todo.status === 'DONE'
  
  // Determine if this was assigned by someone else or to someone else
  const creatorId = todo.createdById || todo.createdBy.id
  const assigneeId = todo.assignedToId || todo.assignedTo.id
  const isDelegated = creatorId !== assigneeId
  
  // Determine what attribution to show
  const isAssignedToMe = currentUserId && assigneeId === currentUserId
  const isCreatedByMe = currentUserId && creatorId === currentUserId
  
  // Show "Assigned by X" when someone else assigned it to me
  const showAssignedBy = isDelegated && (!currentUserId || (isAssignedToMe && !isCreatedByMe))
  // Show "Assigned to X" when I assigned it to someone else
  const showAssignedTo = isDelegated && currentUserId && isCreatedByMe && !isAssignedToMe

  const handleToggle = async () => {
    if (isToggling) return
    setIsToggling(true)
    try {
      await onToggle(todo.id, isDone ? 'OPEN' : 'DONE')
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-colors group",
        "hover:bg-muted/50 cursor-pointer",
        isDone && "opacity-60"
      )}
      onClick={() => onClick?.(todo)}
      data-testid={`todo-item-${todo.id}`}
      data-completed={isDone ? "true" : "false"}
    >
      <div 
        className="flex-shrink-0 pt-0.5"
        onClick={(e) => {
          e.stopPropagation()
          handleToggle()
        }}
      >
        <Checkbox 
          checked={isDone}
          disabled={isToggling}
          className={cn(
            "h-5 w-5 rounded-full border-2",
            isDone ? "bg-green-500 border-green-500" : "border-muted-foreground/50"
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm font-medium truncate",
            isDone && "line-through text-muted-foreground"
          )}>
            {todo.title}
          </span>
          
          {todo.priority && (
            <Badge 
              variant="outline" 
              className={cn("text-xs px-1.5 py-0 h-5 shrink-0", getPriorityColor(todo.priority))}
            >
              {todo.priority}
            </Badge>
          )}
        </div>
        
        {!compact && todo.note && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {todo.note}
          </p>
        )}

        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {/* Assigned by attribution */}
          {showAssignedBy && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <UserCircle className="h-3 w-3" />
              <span>Assigned by {todo.createdBy.name || todo.createdBy.email}</span>
            </div>
          )}
          
          {/* Assigned to attribution */}
          {showAssignedTo && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <UserCircle className="h-3 w-3" />
              <span>Assigned to {todo.assignedTo.name || todo.assignedTo.email}</span>
            </div>
          )}
          
          {dueInfo.label && (
            <div className={cn(
              "flex items-center gap-1 text-xs",
              dueInfo.isOverdue && "text-red-500",
              dueInfo.isToday && "text-amber-500",
              !dueInfo.isOverdue && !dueInfo.isToday && "text-muted-foreground"
            )}>
              {dueInfo.isOverdue ? (
                <AlertCircle className="h-3 w-3" />
              ) : (
                <Calendar className="h-3 w-3" />
              )}
              <span>{dueInfo.label}</span>
            </div>
          )}

          {todo.anchorType !== 'NONE' && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
              {todo.anchorType.toLowerCase()}
            </Badge>
          )}
        </div>
      </div>

      {showAssignee && (
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarImage src={todo.assignedTo.image || ''} alt={todo.assignedTo.name || todo.assignedTo.email} />
          <AvatarFallback className="text-xs bg-muted">
            {getInitials(todo.assignedTo.name, todo.assignedTo.email)}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
