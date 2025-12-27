"use client"

import { TodoItem, Todo } from "./todo-item"
import { Loader2, CheckCircle2 } from "lucide-react"

interface TodoListProps {
  todos: Todo[]
  isLoading?: boolean
  onToggle: (id: string, status: 'OPEN' | 'DONE') => void
  onTodoClick?: (todo: Todo) => void
  showAssignee?: boolean
  compact?: boolean
  emptyMessage?: string
}

export function TodoList({
  todos,
  isLoading,
  onToggle,
  onTodoClick,
  showAssignee = true,
  compact = false,
  emptyMessage = "No to-dos"
}: TodoListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (todos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <CheckCircle2 className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onClick={onTodoClick}
          showAssignee={showAssignee}
          compact={compact}
        />
      ))}
    </div>
  )
}

