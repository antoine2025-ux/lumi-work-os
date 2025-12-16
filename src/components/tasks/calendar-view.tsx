"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Calendar, Plus, User, Tag, Clock } from 'lucide-react'
import Link from 'next/link'
import { TaskEditDialog } from './task-edit-dialog'
import { CreateTaskDialog } from './create-task-dialog'
import { useTaskSidebarStore } from '@/lib/stores/use-task-sidebar-store'
import { cn } from '@/lib/utils'
import { getEpicColor } from '@/lib/utils/epic-colors'

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
    color: string
  }
  epic?: {
    id: string
    title: string
    color: string
  }
  milestone?: {
    id: string
    title: string
  }
  points?: number
  customFields?: Array<{
    id: string
    value: any
    field: {
      id: string
      label: string
      type: string
    }
  }>
}

interface CalendarViewProps {
  projectId: string
  workspaceId?: string
}

const statusOptions = [
  { value: 'TODO', label: 'To Do', color: 'bg-muted text-foreground' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'IN_REVIEW', label: 'In Review', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'DONE', label: 'Done', color: 'bg-green-100 text-green-800' },
  { value: 'BLOCKED', label: 'Blocked', color: 'bg-red-100 text-red-800' }
]

const priorityOptions = [
  { value: 'LOW', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-800' }
]

export default function CalendarView({ projectId, workspaceId }: CalendarViewProps) {
  const { open, setOnTaskUpdate } = useTaskSidebarStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [createTaskDueDate, setCreateTaskDueDate] = useState<string | null>(null)

  useEffect(() => {
    loadTasks()
  }, [projectId, workspaceId])

  const loadTasks = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        projectId,
        workspaceId
      })

      const response = await fetch(`/api/tasks?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditTask = async (task: Task) => {
    // Open sidebar with task ID
    open(task.id)
  }

  const handleCreateTaskForDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    setCreateTaskDueDate(dateStr)
    setIsCreateTaskOpen(true)
  }

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === updatedTask.id ? { ...task, ...updatedTask } : task
      )
    )
    setEditingTask(null)
    setIsEditDialogOpen(false)
  }

  // Register handleTaskUpdate with the task sidebar store so TaskSidebar can notify us
  useEffect(() => {
    setOnTaskUpdate(handleTaskUpdate)
    return () => {
      setOnTaskUpdate(() => {}) // Cleanup: set empty callback
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  const handleCloseEditDialog = () => {
    setEditingTask(null)
    setIsEditDialogOpen(false)
  }

  const updateTaskDueDate = async (taskId: string, newDueDate: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dueDate: newDueDate }),
      })

      if (response.ok) {
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId ? { ...task, dueDate: newDueDate } : task
          )
        )
      }
    } catch (error) {
      console.error('Error updating task due date:', error)
    }
  }

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault()
    if (draggedTask) {
      const newDueDate = targetDate.toISOString().split('T')[0]
      updateTaskDueDate(draggedTask.id, newDueDate)
      setDraggedTask(null)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay())
    
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }
    return days
  }

  const getTasksForDate = (date: Date) => {
    // Normalize date to YYYY-MM-DD format, handling timezone issues
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    // Also try ISO string format in case tasks are stored that way
    const isoDateStr = date.toISOString().split('T')[0]
    
    return tasks.filter(task => {
      if (!task.dueDate) return false
      // Normalize task dueDate to YYYY-MM-DD format
      const taskDate = new Date(task.dueDate)
      const taskYear = taskDate.getFullYear()
      const taskMonth = String(taskDate.getMonth() + 1).padStart(2, '0')
      const taskDay = String(taskDate.getDate()).padStart(2, '0')
      const taskDateStr = `${taskYear}-${taskMonth}-${taskDay}`
      
      return taskDateStr === dateStr || task.dueDate === dateStr || task.dueDate === isoDateStr
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setDate(prev.getDate() - 7)
      } else {
        newDate.setDate(prev.getDate() + 7)
      }
      return newDate
    })
  }

  const getStatusOption = (status: string) => {
    return statusOptions.find(option => option.value === status) || statusOptions[0]
  }

  const getPriorityOption = (priority: string) => {
    return priorityOptions.find(option => option.value === priority) || priorityOptions[1]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`
    } else if (diffDays === 0) {
      return 'Due today'
    } else if (diffDays === 1) {
      return 'Due tomorrow'
    } else {
      return `Due in ${diffDays} days`
    }
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isPastDue = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return (
      <div className="space-y-2">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 text-xs font-medium text-slate-400">
          {dayNames.map(day => (
            <div key={day} className="p-2 text-center">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((date, index) => {
            if (!date) {
              return <div key={index} className="min-h-[88px]"></div>
            }

            const dayTasks = getTasksForDate(date)
            const isCurrentDay = isToday(date)
            const dateNormalized = new Date(date)
            dateNormalized.setHours(0, 0, 0, 0)
            const isPast = dateNormalized < today && !isCurrentDay
            const isCurrentMonth = date.getMonth() === currentDate.getMonth()

            return (
              <div
                key={index}
                className={cn(
                  "group relative flex flex-col rounded-lg border border-slate-800/80 bg-slate-950/60 px-2 py-1.5 min-h-[88px] transition-colors",
                  isCurrentDay && "border-blue-500/60 bg-blue-500/5",
                  isPast && "!opacity-60",
                  "hover:border-slate-600 hover:bg-slate-900/80"
                )}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, date)}
              >
                {/* Day header with hover + button */}
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span className={cn(
                    !isCurrentMonth && "text-slate-600"
                  )}>
                    {date.getDate()}
                  </span>
                  {isCurrentMonth && (
                    <button
                      type="button"
                      onClick={() => handleCreateTaskForDate(date)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-200 text-xs w-4 h-4 flex items-center justify-center rounded"
                      aria-label="Add task for this day"
                    >
                      +
                    </button>
                  )}
                </div>

                {/* Tasks */}
                {dayTasks.length > 0 && (
                  <div className="mt-1 flex flex-col gap-1 flex-1 min-h-0">
                    {dayTasks.slice(0, 2).map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => handleEditTask(task)}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        className="w-full rounded-md bg-slate-900/90 border border-slate-700/70 px-2 py-1 text-left text-xs leading-snug hover:bg-slate-800/90 hover:border-slate-500/80 transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full flex-shrink-0",
                              task.status === 'DONE' && "bg-emerald-400",
                              task.status === 'IN_PROGRESS' && "bg-sky-400",
                              task.status === 'BLOCKED' && "bg-rose-400",
                              (task.status === 'TODO' || !task.status) && "bg-slate-500"
                            )}
                          />
                          <span className="truncate text-[11px] text-slate-50">
                            {task.title}
                          </span>
                        </div>
                        {task.epic?.title && (
                          <div className="mt-0.5 text-[10px] text-slate-400 truncate">
                            {task.epic.title}
                          </div>
                        )}
                        {task.priority && task.priority !== 'MEDIUM' && (
                          <span className="mt-0.5 inline-flex items-center rounded-full border border-amber-500/50 bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
                            {task.priority}
                          </span>
                        )}
                      </button>
                    ))}
                    {dayTasks.length > 2 && (
                      <button
                        onClick={() => handleEditTask(dayTasks[2])}
                        className="mt-1 text-[10px] text-slate-400 hover:text-slate-200 text-left"
                      >
                        +{dayTasks.length - 2} more
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return (
      <div className="space-y-2">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 text-xs font-medium text-slate-400">
          {dayNames.map((day, index) => (
            <div key={day} className="p-2 text-center">
              <div>{day}</div>
              <div className="text-[10px] mt-0.5">{weekDays[index].getDate()}</div>
            </div>
          ))}
        </div>

        {/* Week grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((date, index) => {
            const dayTasks = getTasksForDate(date)
            const isCurrentDay = isToday(date)
            const dateNormalized = new Date(date)
            dateNormalized.setHours(0, 0, 0, 0)
            const isPast = dateNormalized < today && !isCurrentDay

            return (
              <div
                key={index}
                className={cn(
                  "group relative flex flex-col rounded-lg border border-slate-800/80 bg-slate-950/60 px-2 py-2 min-h-[400px] transition-colors",
                  isCurrentDay && "border-blue-500/60 bg-blue-500/5",
                  isPast && "!opacity-60",
                  "hover:border-slate-600 hover:bg-slate-900/80"
                )}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, date)}
              >
                {/* Day header with hover + button */}
                <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-300">
                  <span>
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCreateTaskForDate(date)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-200 text-xs font-medium w-5 h-5 flex items-center justify-center rounded hover:bg-slate-800"
                    aria-label="Add task for this day"
                  >
                    +
                  </button>
                </div>

                {/* Tasks */}
                <div className="space-y-2 flex-1">
                  {dayTasks.map(task => (
                    <button
                      key={task.id}
                      type="button"
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onClick={() => handleEditTask(task)}
                      className="w-full rounded-md bg-slate-900/90 border border-slate-700/70 px-2 py-1.5 text-left text-xs leading-snug hover:bg-slate-800/90 hover:border-slate-500/80 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full flex-shrink-0",
                            task.status === 'DONE' && "bg-emerald-400",
                            task.status === 'IN_PROGRESS' && "bg-sky-400",
                            task.status === 'BLOCKED' && "bg-rose-400",
                            (task.status === 'TODO' || !task.status) && "bg-slate-500"
                          )}
                        />
                        <span className="truncate text-[11px] text-slate-50 font-medium">
                          {task.title}
                        </span>
                      </div>
                      {task.epic?.title && (
                        <div className="mt-1 text-[10px] text-slate-400 truncate">
                          {task.epic.title}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {task.priority && task.priority !== 'MEDIUM' && (
                          <span className="inline-flex items-center rounded-full border border-amber-500/50 bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
                            {task.priority}
                          </span>
                        )}
                        {task.assignee && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <User className="h-3 w-3" />
                            <span className="truncate">{task.assignee.name}</span>
                          </div>
                        )}
                        {task.points && (
                          <span className="text-[10px] text-slate-400">{task.points}p</span>
                        )}
                      </div>
                    </button>
                  ))}
                  {dayTasks.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const currentMonthLabel = viewMode === 'month' 
    ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : `${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(currentDate.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  return (
    <div className="space-y-4">
      {/* Compact Header Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="text-lg font-medium text-slate-50">
          {currentMonthLabel}
        </div>
        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={(value: 'month' | 'week') => setViewMode(value)}>
            <SelectTrigger className="w-32 bg-slate-900 border-slate-700 text-slate-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => viewMode === 'month' ? navigateMonth('prev') : navigateWeek('prev')}
            className="text-slate-400 hover:text-slate-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => viewMode === 'month' ? navigateMonth('next') : navigateWeek('next')}
            className="text-slate-400 hover:text-slate-200"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentDate(new Date())}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Today
          </Button>
          <Button 
            size="sm" 
            onClick={() => {
              setCreateTaskDueDate(null)
              setIsCreateTaskOpen(true)
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-100"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <div>
        {viewMode === 'month' ? renderMonthView() : renderWeekView()}
      </div>

      {/* Task Edit Dialog */}
      <TaskEditDialog
        isOpen={isEditDialogOpen}
        onClose={handleCloseEditDialog}
        task={editingTask}
        onSave={handleTaskUpdate}
      />

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={isCreateTaskOpen}
        onOpenChange={(open) => {
          setIsCreateTaskOpen(open)
          if (!open) {
            setCreateTaskDueDate(null)
          }
        }}
        projectId={projectId}
        defaultDueDate={createTaskDueDate || undefined}
        onTaskCreated={() => {
          loadTasks()
          setCreateTaskDueDate(null)
        }}
      />
    </div>
  )
}
