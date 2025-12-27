"use client"

import { useState, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TodoList, TodoQuickAdd, CreateTodoDialog, Todo } from "@/components/todos"
import { useWorkspace } from "@/lib/workspace-context"
import { 
  Plus, 
  CheckSquare, 
  ChevronDown,
  CheckCircle2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TaskTodosSectionProps {
  taskId: string
  className?: string
}

export function TaskTodosSection({ taskId, className }: TaskTodosSectionProps) {
  const { currentWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  
  const [showCompleted, setShowCompleted] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)

  // Fetch task todos
  const { data: todos = [], isLoading } = useQuery({
    queryKey: ['todos', 'task', taskId],
    queryFn: async () => {
      const params = new URLSearchParams({
        anchorType: 'TASK',
        anchorId: taskId,
        showAll: 'true' // Show all todos for task context
      })
      const response = await fetch(`/api/todos?${params}`)
      if (!response.ok) throw new Error('Failed to fetch todos')
      return response.json() as Promise<Todo[]>
    },
    enabled: !!currentWorkspace && !!taskId
  })

  const openTodos = todos.filter(t => t.status === 'OPEN')
  const completedTodos = todos.filter(t => t.status === 'DONE')

  const handleToggle = useCallback(async (id: string, status: 'OPEN' | 'DONE') => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      
      if (!response.ok) throw new Error('Failed to update todo')
      
      queryClient.invalidateQueries({ queryKey: ['todos', 'task', taskId] })
    } catch (error) {
      console.error('Error toggling todo:', error)
    }
  }, [queryClient, taskId])

  const handleTodoCreated = useCallback((newTodo: Todo) => {
    // Optimistically update all todo query caches
    queryClient.setQueriesData<Todo[]>(
      { queryKey: ['todos'] },
      (oldData = []) => {
        // Check if todo already exists (in case of duplicate calls)
        if (oldData.some(t => t.id === newTodo.id)) {
          return oldData
        }
        // Add new todo to the beginning of the array
        return [newTodo, ...oldData]
      }
    )
    // Invalidate and refetch to ensure all queries are updated
    queryClient.invalidateQueries({ queryKey: ['todos'] })
    queryClient.refetchQueries({ queryKey: ['todos'], type: 'active' })
    setIsDialogOpen(false)
    setEditingTodo(null)
  }, [queryClient])

  const handleTodoClick = useCallback((todo: Todo) => {
    setEditingTodo(todo)
    setIsDialogOpen(true)
  }, [])

  return (
    <>
      <Card className={cn("", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span>To-dos</span>
              {openTodos.length > 0 && (
                <Badge variant="outline" className="text-xs">{openTodos.length}</Badge>
              )}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-6 w-6"
              onClick={() => { setEditingTodo(null); setIsDialogOpen(true); }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Quick Add */}
          <TodoQuickAdd 
            onCreated={handleTodoCreated}
            placeholder="Add a to-do..."
            anchorType="TASK"
            anchorId={taskId}
            defaultDueToday={false}
          />

          {/* Open Todos */}
          <TodoList
            todos={openTodos}
            isLoading={isLoading}
            onToggle={handleToggle}
            onTodoClick={handleTodoClick}
            showAssignee={true}
            compact={true}
            emptyMessage="No to-dos"
          />

          {/* Completed Section */}
          {completedTodos.length > 0 && (
            <div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-between h-7 px-2"
                onClick={() => setShowCompleted(!showCompleted)}
              >
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span className="text-xs">Completed ({completedTodos.length})</span>
                </div>
                <ChevronDown className={cn(
                  "h-3 w-3 transition-transform",
                  showCompleted && "rotate-180"
                )} />
              </Button>
              {showCompleted && (
                <div className="pt-2">
                  <TodoList
                    todos={completedTodos}
                    onToggle={handleToggle}
                    onTodoClick={handleTodoClick}
                    showAssignee={true}
                    compact={true}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <CreateTodoDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onCreated={handleTodoCreated}
        editTodo={editingTodo}
        anchorType="TASK"
        anchorId={taskId}
      />
    </>
  )
}

