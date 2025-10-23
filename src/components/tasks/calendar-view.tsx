"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Calendar, Plus, User, Tag, Clock } from 'lucide-react'
import Link from 'next/link'
import { TaskEditDialog } from './task-edit-dialog'

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
  { value: 'TODO', label: 'To Do', color: 'bg-gray-100 text-gray-800' },
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
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)

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

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setIsEditDialogOpen(true)
  }

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      )
    )
    setEditingTask(null)
    setIsEditDialogOpen(false)
  }

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
    const dateStr = date.toISOString().split('T')[0]
    return tasks.filter(task => task.dueDate === dateStr)
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

    return (
      <div className="space-y-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1">
          {dayNames.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            if (!date) {
              return <div key={index} className="h-24 border border-gray-200 rounded"></div>
            }

            const dayTasks = getTasksForDate(date)
            const isCurrentDay = isToday(date)
            const isPast = isPastDue(date)

            return (
              <div
                key={index}
                className={`h-24 border border-gray-200 rounded p-1 ${
                  isCurrentDay ? 'bg-blue-50 border-blue-300' : ''
                } ${isPast ? 'bg-red-50' : ''}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, date)}
              >
                <div className={`text-xs font-medium mb-1 ${
                  isCurrentDay ? 'text-blue-600' : isPast ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {date.getDate()}
                </div>
                <div className="space-y-1 overflow-hidden">
                  {dayTasks.slice(0, 3).map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      className="text-xs p-1 bg-white rounded border cursor-move hover:shadow-sm"
                      onClick={() => handleEditTask(task)}
                    >
                      <div className="font-medium truncate">{task.title}</div>
                      <div className="flex items-center gap-1">
                        <Badge className={`text-xs ${getStatusOption(task.status).color}`}>
                          {getStatusOption(task.status).label}
                        </Badge>
                        {task.points && (
                          <span className="text-xs text-muted-foreground">{task.points}p</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{dayTasks.length - 3} more
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

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    return (
      <div className="space-y-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1">
          {dayNames.map((day, index) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              <div>{day}</div>
              <div className="text-xs">{weekDays[index].getDate()}</div>
            </div>
          ))}
        </div>

        {/* Week grid */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((date, index) => {
            const dayTasks = getTasksForDate(date)
            const isCurrentDay = isToday(date)
            const isPast = isPastDue(date)

            return (
              <div
                key={index}
                className={`min-h-96 border border-gray-200 rounded p-2 ${
                  isCurrentDay ? 'bg-blue-50 border-blue-300' : ''
                } ${isPast ? 'bg-red-50' : ''}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, date)}
              >
                <div className={`text-sm font-medium mb-2 ${
                  isCurrentDay ? 'text-blue-600' : isPast ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="space-y-2">
                  {dayTasks.map(task => (
                    <Card
                      key={task.id}
                      className="cursor-pointer hover:shadow-sm"
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onClick={() => handleEditTask(task)}
                    >
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="font-medium text-sm line-clamp-2">
                            {task.title}
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge className={`text-xs ${getStatusOption(task.status).color}`}>
                              {getStatusOption(task.status).label}
                            </Badge>
                            <Badge className={`text-xs ${getPriorityOption(task.priority).color}`}>
                              {getPriorityOption(task.priority).label}
                            </Badge>
                          </div>
                          {task.assignee && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              {task.assignee.name}
                            </div>
                          )}
                          {task.epic && (
                            <div className="flex items-center gap-1 text-xs">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: task.epic.color }}
                              />
                              {task.epic.title}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {dayTasks.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Calendar View
          </h2>
          <p className="text-muted-foreground">
            {tasks.filter(task => task.dueDate).length} tasks with due dates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={(value: 'month' | 'week') => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild>
            <Link href={`/projects/${projectId}/tasks/new`}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Link>
          </Button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => viewMode === 'month' ? navigateMonth('prev') : navigateWeek('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-48 text-center">
            {viewMode === 'month' 
              ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              : `${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(currentDate.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            }
          </h3>
          <Button variant="outline" size="sm" onClick={() => viewMode === 'month' ? navigateMonth('next') : navigateWeek('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
          Today
        </Button>
      </div>

      {/* Calendar */}
      <Card>
        <CardContent className="p-6">
          {viewMode === 'month' ? renderMonthView() : renderWeekView()}
        </CardContent>
      </Card>

      {/* Task Edit Dialog */}
      <TaskEditDialog
        isOpen={isEditDialogOpen}
        onClose={handleCloseEditDialog}
        task={editingTask}
        onSave={handleTaskUpdate}
      />
    </div>
  )
}
