"use client"

import { useState, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { TodoList, TodoQuickAdd, CreateTodoDialog, Todo } from "@/components/todos"
import { useWorkspace } from "@/lib/workspace-context"
import { 
  Plus, 
  CheckSquare, 
  ChevronDown,
  CheckCircle2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ProjectTodosSectionProps {
  projectId: string
  projectName?: string
  className?: string
}

export function ProjectTodosSection({ projectId, className }: ProjectTodosSectionProps) {
  const { currentWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  
  const [showAll, setShowAll] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)

  // Fetch project todos
  const { data: todos = [], isLoading } = useQuery({
    queryKey: ['todos', 'project', projectId, showAll],
    queryFn: async () => {
      const params = new URLSearchParams({
        anchorType: 'PROJECT',
        anchorId: projectId
      })
      if (showAll) {
        params.set('showAll', 'true')
      }
      const response = await fetch(`/api/todos?${params}`)
      if (!response.ok) throw new Error('Failed to fetch todos')
      return response.json() as Promise<Todo[]>
    },
    enabled: !!currentWorkspace && !!projectId
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
      
      queryClient.invalidateQueries({ queryKey: ['todos', 'project', projectId] })
    } catch (error) {
      console.error('Error toggling todo:', error)
    }
  }, [queryClient, projectId])

  const handleTodoCreated = useCallback((newTodo: Todo) => {
    // Optimistically update all todo query caches
    queryClient.setQueriesData<Todo[]>(
      { queryKey: ['todos'] },
      (oldData = []) => {
        // Ensure oldData is an array before calling .some()
        if (!Array.isArray(oldData)) {
          return oldData
        }
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
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              <span>Project To-dos</span>
              {openTodos.length > 0 && (
                <Badge variant="outline" className="ml-2">{openTodos.length}</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-all"
                  checked={showAll}
                  onCheckedChange={setShowAll}
                />
                <Label htmlFor="show-all" className="text-xs text-muted-foreground cursor-pointer">
                  Show all
                </Label>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { setEditingTodo(null); setIsDialogOpen(true); }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Add */}
          <TodoQuickAdd 
            onCreated={handleTodoCreated}
            placeholder="Add a to-do to this project..."
            anchorType="PROJECT"
            anchorId={projectId}
            defaultDueToday={false}
          />

          {/* Open Todos */}
          <TodoList
            todos={openTodos}
            isLoading={isLoading}
            onToggle={handleToggle}
            onTodoClick={handleTodoClick}
            showAssignee={showAll}
            emptyMessage="No to-dos for this project yet"
          />

          {/* Completed Section */}
          {completedTodos.length > 0 && (
            <div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-between"
                onClick={() => setShowCompleted(!showCompleted)}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Completed</span>
                  <Badge variant="secondary" className="text-xs">
                    {completedTodos.length}
                  </Badge>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  showCompleted && "rotate-180"
                )} />
              </Button>
              {showCompleted && (
                <div className="pt-2">
                  <TodoList
                    todos={completedTodos}
                    onToggle={handleToggle}
                    onTodoClick={handleTodoClick}
                    showAssignee={showAll}
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
        anchorType="PROJECT"
        anchorId={projectId}
      />
    </>
  )
}

