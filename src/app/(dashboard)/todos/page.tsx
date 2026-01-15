"use client"

import { useState, useCallback, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
  TodoList, 
  TodoQuickAdd, 
  CreateTodoDialog, 
  Todo, 
  TodoViewsSidebar,
  TodoViewType 
} from "@/components/todos"
import { useWorkspace } from "@/lib/workspace-context"
import { WikiLayout } from "@/components/wiki/wiki-layout"
import { 
  Plus, 
  Sun, 
  Inbox, 
  Calendar, 
  CalendarDays,
  List
} from "lucide-react"
import { cn } from "@/lib/utils"

type ScheduleFilter = 'today' | 'inbox' | 'upcoming' | 'thisWeek' | 'all'

const scheduleFilters = [
  { id: 'today' as const, label: 'Today', icon: Sun, color: 'text-amber-500' },
  { id: 'inbox' as const, label: 'Inbox', icon: Inbox, color: 'text-blue-500' },
  { id: 'upcoming' as const, label: 'Upcoming', icon: Calendar, color: 'text-purple-500' },
  { id: 'thisWeek' as const, label: 'This Week', icon: CalendarDays, color: 'text-green-500' },
  { id: 'all' as const, label: 'All', icon: List, color: 'text-gray-500' }
]

export default function TodosPage() {
  const { currentWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get view from URL or default to 'my'
  const urlView = searchParams.get('view') as TodoViewType | null
  const urlSchedule = searchParams.get('schedule') as ScheduleFilter | null
  
  const [activeView, setActiveView] = useState<TodoViewType>(urlView || 'my')
  const [activeSchedule, setActiveSchedule] = useState<ScheduleFilter>(urlSchedule || 'all')
  const [showCreatedByMe, setShowCreatedByMe] = useState(false) // For completed view toggle
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)

  // Update URL when view changes
  const updateUrl = useCallback((view: TodoViewType, schedule?: ScheduleFilter) => {
    const params = new URLSearchParams()
    params.set('view', view)
    if (schedule && view !== 'completed') {
      params.set('schedule', schedule)
    }
    router.replace(`/todos?${params.toString()}`, { scroll: false })
  }, [router])

  const handleViewChange = useCallback((view: TodoViewType) => {
    setActiveView(view)
    // Reset schedule when changing views
    if (view === 'completed') {
      updateUrl(view)
    } else {
      updateUrl(view, activeSchedule)
    }
  }, [activeSchedule, updateUrl])

  const handleScheduleChange = useCallback((schedule: ScheduleFilter) => {
    setActiveSchedule(schedule)
    updateUrl(activeView, schedule)
  }, [activeView, updateUrl])

  // Build query params for API
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    params.set('view', activeView)
    
    if (activeView !== 'completed' && activeSchedule !== 'all') {
      params.set('schedule', activeSchedule)
    }
    
    if (activeView === 'completed' && showCreatedByMe) {
      params.set('createdByMe', 'true')
    }
    
    return params.toString()
  }, [activeView, activeSchedule, showCreatedByMe])

  // Fetch todos for active view
  const { data: todos = [], isLoading } = useQuery({
    queryKey: ['todos', activeView, activeSchedule, showCreatedByMe],
    queryFn: async () => {
      const response = await fetch(`/api/todos?${queryParams}`)
      if (!response.ok) throw new Error('Failed to fetch todos')
      return response.json() as Promise<Todo[]>
    },
    enabled: !!currentWorkspace
  })

  // Fetch counts for sidebar (lightweight queries)
  const { data: viewCounts } = useQuery({
    queryKey: ['todos', 'counts'],
    queryFn: async () => {
      // Fetch counts for each view in parallel
      const views: TodoViewType[] = ['my', 'assignedToMe', 'assignedByMe', 'created', 'completed']
      const promises = views.map(async (view) => {
        const response = await fetch(`/api/todos?view=${view}`)
        if (!response.ok) return { view, count: 0 }
        const data = await response.json()
        return { view, count: Array.isArray(data) ? data.length : 0 }
      })
      
      const results = await Promise.all(promises)
      return results.reduce((acc, { view, count }) => {
        acc[view] = count
        return acc
      }, {} as Record<TodoViewType, number>)
    },
    enabled: !!currentWorkspace,
    staleTime: 30000 // 30 seconds
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
  }, [queryClient])

  const handleTodoClick = useCallback((todo: Todo) => {
    setEditingTodo(todo)
    setIsDialogOpen(true)
  }, [])

  // Get view title and description
  const viewInfo = useMemo(() => {
    switch (activeView) {
      case 'my':
      case 'assignedToMe':
        return { title: 'My Tasks', description: 'Tasks assigned to you' }
      case 'assignedByMe':
        return { title: 'Assigned by Me', description: 'Tasks you delegated to others' }
      case 'created':
        return { title: 'Tasks Created', description: 'All tasks you created' }
      case 'completed':
        return { title: 'Completed', description: 'Finished tasks' }
      default:
        return { title: 'To-dos', description: 'Manage your tasks' }
    }
  }, [activeView])

  const openTodos = todos.filter(t => t.status === 'OPEN')
  const doneTodos = todos.filter(t => t.status === 'DONE')

  return (
    <WikiLayout>
      <div className="min-h-screen bg-background flex">
        {/* Sidebar */}
        <TodoViewsSidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          counts={viewCounts}
          className="hidden md:flex"
        />

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold">{viewInfo.title}</h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {viewInfo.description}
                </p>
              </div>
              <Button onClick={() => { setEditingTodo(null); setIsDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                New To-do
              </Button>
            </div>

            {/* Schedule Filter Tabs (only for non-completed views) */}
            {activeView !== 'completed' && (
              <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
                {scheduleFilters.map((filter) => {
                  const Icon = filter.icon
                  const isActive = activeSchedule === filter.id
                  
                  return (
                    <Button
                      key={filter.id}
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleScheduleChange(filter.id)}
                      className={cn(
                        "shrink-0",
                        isActive && "shadow-sm"
                      )}
                    >
                      <Icon className={cn(
                        "h-4 w-4 mr-1.5",
                        !isActive && filter.color
                      )} />
                      {filter.label}
                    </Button>
                  )
                })}
              </div>
            )}

            {/* Completed View Toggle */}
            {activeView === 'completed' && (
              <div className="flex items-center gap-2 mb-6">
                <Switch
                  id="created-by-me"
                  checked={showCreatedByMe}
                  onCheckedChange={setShowCreatedByMe}
                />
                <Label htmlFor="created-by-me" className="text-sm text-muted-foreground cursor-pointer">
                  Show tasks I created (instead of assigned to me)
                </Label>
              </div>
            )}

            {/* Quick Add (only for non-completed views) */}
            {activeView !== 'completed' && (
              <Card className="mb-6">
                <CardContent className="pt-4">
                  <TodoQuickAdd 
                    onCreated={handleTodoCreated}
                    defaultDueToday={activeSchedule === 'today'}
                    placeholder="Add a new to-do..."
                  />
                </CardContent>
              </Card>
            )}

            {/* Todos List */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  {activeView === 'completed' ? 'Completed Tasks' : 'Open Tasks'}
                  <Badge variant="outline" className="ml-2">
                    {activeView === 'completed' ? doneTodos.length : openTodos.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TodoList
                  todos={activeView === 'completed' ? doneTodos : openTodos}
                  isLoading={isLoading}
                  onToggle={handleToggle}
                  onTodoClick={handleTodoClick}
                  showAssignee={activeView === 'assignedByMe' || activeView === 'created'}
                  emptyMessage={
                    activeView === 'completed'
                      ? "No completed tasks yet"
                      : activeSchedule === 'today'
                      ? "No tasks for today. Great job!"
                      : activeSchedule === 'inbox'
                      ? "Your inbox is empty"
                      : "No tasks found"
                  }
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mobile View Selector */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t p-2 flex justify-around">
          {(['my', 'assignedByMe', 'completed'] as TodoViewType[]).map((view) => (
            <Button
              key={view}
              variant={activeView === view ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewChange(view)}
              className="flex-1"
            >
              {view === 'my' ? 'My Tasks' : view === 'assignedByMe' ? 'Delegated' : 'Done'}
            </Button>
          ))}
        </div>

        {/* Create/Edit Dialog */}
        <CreateTodoDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onCreated={handleTodoCreated}
          editTodo={editingTodo}
        />
      </div>
    </WikiLayout>
  )
}
