"use client"

import { useCallback, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TodoList, CreateTodoDialog, Todo } from "@/components/todos"
import { useWorkspace } from "@/lib/workspace-context"
import { ChevronRight, Plus, List, Send } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface TodaysTodosCardProps {
  className?: string
}

type ScheduleFilter = 'today' | 'thisWeek' | 'all'

export function TodaysTodosCard({ className }: TodaysTodosCardProps) {
  const { currentWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>('today')

  // Fetch my tasks with schedule filter (uses new view-based API)
  const { data: todos = [], isLoading } = useQuery({
    queryKey: ['todos', 'dashboard', scheduleFilter],
    queryFn: async () => {
      // Use the new view-based API: view=my with schedule filter
      const url = scheduleFilter === 'all'
        ? '/api/todos?view=my'
        : `/api/todos?view=my&schedule=${scheduleFilter}`
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch todos')
      return response.json() as Promise<Todo[]>
    },
    enabled: !!currentWorkspace,
    staleTime: 30000,
    refetchOnWindowFocus: true
  })

  // Fetch count of todos I assigned to others
  const { data: assignedByMeCount = 0 } = useQuery({
    queryKey: ['todos', 'assignedByMe', 'count'],
    queryFn: async () => {
      const response = await fetch('/api/todos?view=assignedByMe')
      if (!response.ok) return 0
      const data = await response.json()
      return Array.isArray(data) ? data.length : 0
    },
    enabled: !!currentWorkspace,
    staleTime: 60000
  })

  const handleToggle = useCallback(async (id: string, status: 'OPEN' | 'DONE') => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      
      if (!response.ok) throw new Error('Failed to update todo')
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    } catch (error) {
      console.error('Error toggling todo:', error)
    }
  }, [queryClient])

  const handleTodoCreated = useCallback((newTodo: Todo) => {
    // Optimistically update all todo query caches
    queryClient.setQueriesData<Todo[]>(
      { queryKey: ['todos'] },
      (oldData = []) => {
        // Ensure oldData is an array before calling .some()
        if (!Array.isArray(oldData)) {
          return oldData
        }
        if (oldData.some(t => t.id === newTodo.id)) {
          return oldData
        }
        return [newTodo, ...oldData]
      }
    )
    queryClient.invalidateQueries({ queryKey: ['todos'] })
    queryClient.refetchQueries({ queryKey: ['todos'], type: 'active' })
    setIsDialogOpen(false)
  }, [queryClient])

  const openCount = todos.filter(t => t.status === 'OPEN').length

  return (
    <>
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <Link href="/todos" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <List className="h-5 w-5 text-primary" />
              <span className="cursor-pointer">To-do list</span>
            </Link>
            <div className="flex items-center gap-2">
              {openCount > 0 && (
                <Badge variant="outline" className="text-xs">{openCount}</Badge>
              )}
              <Select value={scheduleFilter} onValueChange={(v) => setScheduleFilter(v as ScheduleFilter)}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="thisWeek">This week</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[340px] overflow-y-auto dashboard-card-scroll">
          {!isLoading && openCount === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                {scheduleFilter === 'today' ? 'No to-dos for today' : 
                 scheduleFilter === 'thisWeek' ? 'No to-dos this week' : 
                 'No to-dos'}
              </p>
            </div>
          ) : (
            <>
              <TodoList
                todos={todos.filter(t => t.status === 'OPEN').slice(0, 5)}
                isLoading={isLoading}
                onToggle={handleToggle}
                showAssignee={false}
                compact={true}
                emptyMessage={
                  scheduleFilter === 'today' ? 'No to-dos for today' : 
                  scheduleFilter === 'thisWeek' ? 'No to-dos this week' : 
                  'No to-dos'
                }
              />
              
              {todos.filter(t => t.status === 'OPEN').length > 5 && (
                <Link href="/todos" className="block">
                  <Button variant="ghost" size="sm" className="w-full justify-center text-muted-foreground hover:text-foreground">
                    View all {openCount} to-dos
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              )}
            </>
          )}

          {/* Assigned by me link */}
          {assignedByMeCount > 0 && (
            <Link href="/todos?view=assignedByMe" className="block pt-2 border-t">
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                <Send className="h-3.5 w-3.5 mr-2" />
                Delegated to others
                <Badge variant="secondary" className="ml-auto text-xs">{assignedByMeCount}</Badge>
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>

      <CreateTodoDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onCreated={handleTodoCreated}
      />
    </>
  )
}
