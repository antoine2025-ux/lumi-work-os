"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { useTaskSidebarStore } from '@/lib/stores/use-task-sidebar-store'
import { cn } from '@/lib/utils'
import { getEpicColor } from '@/lib/utils/epic-colors'

interface Task {
  id: string
  title: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  startDate?: string // Optional, may not exist in schema - will use dueDate if missing
  epic?: {
    id: string
    title: string
    color?: string
  }
  assignee?: {
    id: string
    name: string
    email?: string
  }
  createdAt?: string
  updatedAt?: string
}

interface TimelineViewProps {
  projectId: string
  workspaceId?: string
}

const DAY_WIDTH = 40 // pixels per day
const ROW_HEIGHT = 48 // pixels per task row

const statusColors = {
  'DONE': 'bg-emerald-500/80',
  'IN_PROGRESS': 'bg-sky-500/80',
  'BLOCKED': 'bg-rose-500/80',
  'IN_REVIEW': 'bg-purple-500/80',
  'TODO': 'bg-slate-500/80',
}

const statusColorsSolid = {
  'DONE': 'bg-emerald-500',
  'IN_PROGRESS': 'bg-sky-500',
  'BLOCKED': 'bg-rose-500',
  'IN_REVIEW': 'bg-purple-500',
  'TODO': 'bg-slate-500',
}

export default function TimelineView({ projectId, workspaceId }: TimelineViewProps) {
  const { open, setOnTaskUpdate } = useTaskSidebarStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month')
  const timelineScrollRef = useRef<HTMLDivElement>(null)
  const headerScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadTasks()
  }, [projectId, workspaceId])

  const loadTasks = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        projectId,
        ...(workspaceId && { workspaceId }),
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

  const handleTaskUpdate = (updatedTask: any) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === updatedTask.id ? { ...task, ...updatedTask } : task
      )
    )
  }

  // Register handleTaskUpdate with the task sidebar store
  useEffect(() => {
    setOnTaskUpdate(handleTaskUpdate)
    return () => {
      setOnTaskUpdate(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filter tasks that have dates
  const tasksWithDates = useMemo(() => {
    return tasks.filter(task => task.dueDate || task.startDate)
  }, [tasks])

  // Calculate date range
  const dateRange = useMemo(() => {
    if (tasksWithDates.length === 0) {
      const today = new Date()
      const start = new Date(today)
      start.setDate(start.getDate() - 7)
      const end = new Date(today)
      end.setDate(end.getDate() + 30)
      return { start, end }
    }

    const dates: Date[] = []
    tasksWithDates.forEach(task => {
      if (task.startDate) dates.push(new Date(task.startDate))
      if (task.dueDate) dates.push(new Date(task.dueDate))
    })

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))

    // Add padding
    const start = new Date(minDate)
    start.setDate(start.getDate() - 3)
    const end = new Date(maxDate)
    end.setDate(end.getDate() + 3)

    return { start, end }
  }, [tasksWithDates])

  // Generate array of dates in range
  const dateArray = useMemo(() => {
    const dates: Date[] = []
    const current = new Date(dateRange.start)
    while (current <= dateRange.end) {
      dates.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return dates
  }, [dateRange])

  // Get today's date for highlighting
  const today = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now
  }, [])

  // Find today's index in date array
  const todayIndex = useMemo(() => {
    return dateArray.findIndex(date => {
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)
      return d.getTime() === today.getTime()
    })
  }, [dateArray, today])

  // Calculate task bar position and width
  const getTaskBarStyle = (task: Task) => {
    if (!task.dueDate && !task.startDate) return null

    // Use startDate if present, otherwise use dueDate as start
    let taskStart: Date
    let taskEnd: Date

    if (task.startDate) {
      taskStart = new Date(task.startDate)
      taskEnd = task.dueDate ? new Date(task.dueDate) : new Date(task.startDate)
    } else if (task.dueDate) {
      // If only dueDate exists, use it as both start and end (single day bar)
      // Or estimate a start date based on priority
      taskEnd = new Date(task.dueDate)
      taskStart = new Date(task.dueDate)
      // Estimate duration based on priority (default to 3 days)
      const estimatedDays = task.priority === 'URGENT' ? 1 : task.priority === 'HIGH' ? 2 : task.priority === 'LOW' ? 5 : 3
      taskStart.setDate(taskStart.getDate() - estimatedDays)
    } else {
      return null
    }

    // Normalize dates
    taskStart.setHours(0, 0, 0, 0)
    taskEnd.setHours(0, 0, 0, 0)

    const rangeStart = new Date(dateRange.start)
    rangeStart.setHours(0, 0, 0, 0)

    const startOffset = Math.floor((taskStart.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24))
    const endOffset = Math.floor((taskEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24))
    const width = Math.max(1, endOffset - startOffset + 1)

    return {
      left: `${startOffset * DAY_WIDTH}px`,
      width: `${width * DAY_WIDTH}px`,
    }
  }

  // Sync horizontal scrolling between header and timeline
  const handleTimelineScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }

  // Scroll to today
  const scrollToToday = () => {
    if (timelineScrollRef.current && todayIndex >= 0) {
      const scrollPosition = todayIndex * DAY_WIDTH - timelineScrollRef.current.clientWidth / 2
      timelineScrollRef.current.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth',
      })
    }
  }

  // Format date for header
  const formatDateHeader = (date: Date) => {
    const isFirstOfMonth = date.getDate() === 1
    const isToday = date.getTime() === today.getTime()

    if (isFirstOfMonth || isToday) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    return date.getDate().toString()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={scrollToToday}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Today
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-slate-700">
            {(['week', 'month'] as const).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(mode)}
                className={cn(
                  "rounded-none first:rounded-l-md last:rounded-r-md",
                  viewMode === mode ? "bg-slate-800" : "text-slate-400"
                )}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Container */}
      <div className="border border-slate-800 rounded-lg bg-slate-950/60 overflow-hidden">
        {/* Timeline Header */}
        <div className="flex border-b border-slate-800 bg-slate-900/50">
          {/* Left column header */}
          <div className="w-64 flex-shrink-0 border-r border-slate-800 px-4 py-2">
            <div className="text-sm font-medium text-slate-300">Tasks</div>
          </div>
          {/* Date header row */}
          <div
            ref={headerScrollRef}
            className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
            style={{ scrollbarWidth: 'thin' }}
          >
            <div className="flex min-w-max relative" style={{ width: `${dateArray.length * DAY_WIDTH}px` }}>
              {dateArray.map((date, index) => {
                const isTodayDate = date.getTime() === today.getTime()
                const isPast = date < today
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex-shrink-0 border-r border-slate-800 px-2 py-2 text-center",
                      "text-xs font-medium min-w-[40px]",
                      isTodayDate && "bg-blue-500/10 border-blue-500/50",
                      isPast && "text-slate-500",
                      !isPast && "text-slate-300"
                    )}
                  >
                    <div>{formatDateHeader(date)}</div>
                  </div>
                )
              })}
              {/* Today vertical line indicator */}
              {todayIndex >= 0 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 pointer-events-none"
                  style={{ left: `${todayIndex * DAY_WIDTH}px` }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Timeline Body */}
        <div className="flex overflow-hidden" style={{ maxHeight: '600px' }}>
          {/* Left column - Task names */}
          <div className="w-64 flex-shrink-0 border-r border-slate-800 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
            <div className="space-y-0">
              {tasksWithDates.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  No tasks with dates
                </div>
              ) : (
                tasksWithDates.map((task, index) => (
                  <div
                    key={task.id}
                    className="px-4 py-3 border-b border-slate-800/50 h-[48px] flex flex-col justify-center"
                  >
                    <div className="text-sm font-medium text-slate-100 truncate">
                      {task.title}
                    </div>
                    {task.epic?.title && (
                      <div className="mt-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4"
                          style={{
                            backgroundColor: `${getEpicColor(task.epic)}15`,
                            color: getEpicColor(task.epic),
                            borderColor: `${getEpicColor(task.epic)}40`,
                          }}
                        >
                          {task.epic.title}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right column - Timeline bars */}
          <div
            ref={timelineScrollRef}
            onScroll={handleTimelineScroll}
            className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
            style={{ scrollbarWidth: 'thin' }}
          >
            <div className="relative" style={{ width: `${dateArray.length * DAY_WIDTH}px`, minHeight: `${tasksWithDates.length * ROW_HEIGHT}px` }}>
              {/* Today vertical line */}
              {todayIndex >= 0 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-blue-500/60 z-0 pointer-events-none"
                  style={{ left: `${todayIndex * DAY_WIDTH}px` }}
                />
              )}

              {/* Task bars */}
              {tasksWithDates.map((task, rowIndex) => {
                const barStyle = getTaskBarStyle(task)
                if (!barStyle) return null

                const epicColor = getEpicColor(task.epic)
                const statusColor = statusColors[task.status] || statusColors['TODO']

                return (
                  <div
                    key={task.id}
                    className="absolute h-[48px] flex items-center"
                    style={{ top: `${rowIndex * ROW_HEIGHT}px` }}
                  >
                    <button
                      type="button"
                      onClick={() => open(task.id)}
                      className={cn(
                        "absolute h-8 rounded-md px-2 text-xs font-medium text-white",
                        "hover:scale-[1.02] hover:shadow-lg transition-all cursor-pointer",
                        "flex items-center gap-1.5",
                        statusColor
                      )}
                      style={{
                        left: barStyle.left,
                        width: barStyle.width,
                        borderLeftWidth: '3px',
                        borderLeftColor: epicColor,
                        minWidth: '60px',
                      }}
                    >
                      <span className="truncate">{task.title}</span>
                    </button>
                  </div>
                )
              })}

              {/* Grid lines for each day */}
              {dateArray.map((date, index) => {
                const isTodayDate = date.getTime() === today.getTime()
                const isPast = date < today
                return (
                  <div
                    key={index}
                    className={cn(
                      "absolute top-0 bottom-0 border-r",
                      isTodayDate ? "border-blue-500/30" : "border-slate-800/50",
                      isPast && "opacity-50"
                    )}
                    style={{ left: `${index * DAY_WIDTH}px` }}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

