"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X
} from "lucide-react"

interface Task {
  id: string
  title: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  assignee?: {
    id: string
    name: string
  }
  createdAt: string
  order?: number
  dependencies?: string[] // Array of task IDs this task depends on
}

interface Project {
  id: string
  name: string
  startDate?: string
  endDate?: string
  tasks: Task[]
}

interface GanttChartProps {
  project: Project
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
}

interface GanttTask {
  id: string
  title: string
  status: string
  priority: string
  assignee?: string
  startDate: Date
  endDate: Date
  duration: number
  progress: number
  color: string
  dependencies: string[]
  level: number // For visual hierarchy
}

const statusColors = {
  'TODO': '#94a3b8',
  'IN_PROGRESS': '#3b82f6',
  'IN_REVIEW': '#f59e0b',
  'DONE': '#10b981',
  'BLOCKED': '#ef4444'
}

const priorityColors = {
  'LOW': '#10b981',
  'MEDIUM': '#f59e0b',
  'HIGH': '#f97316',
  'URGENT': '#ef4444'
}

export default function GanttChart({ project, onTaskUpdate }: GanttChartProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'quarter'>('month')
  const [selectedTask, setSelectedTask] = useState<string | null>(null)

  // Debug logging
  useEffect(() => {
    console.log('GanttChart - Project data:', project)
    console.log('GanttChart - Tasks count:', project.tasks.length)
  }, [project])

  // Calculate project timeline
  const projectTimeline = useMemo(() => {
    if (!project.startDate && !project.endDate) {
      // If no project dates, use task dates or current date
      const taskDates = project.tasks
        .map(task => task.dueDate ? new Date(task.dueDate) : null)
        .filter(Boolean) as Date[]
      
      if (taskDates.length === 0) {
        const start = new Date()
        const end = new Date()
        end.setDate(end.getDate() + 30) // Default 30 days
        return { start, end }
      }
      
      const start = new Date(Math.min(...taskDates.map(d => d.getTime())))
      const end = new Date(Math.max(...taskDates.map(d => d.getTime())))
      return { start, end }
    }

    return {
      start: project.startDate ? new Date(project.startDate) : new Date(),
      end: project.endDate ? new Date(project.endDate) : new Date()
    }
  }, [project])

  // Process tasks for Gantt chart with dependency calculation
  const ganttTasks = useMemo((): GanttTask[] => {
    if (!project.tasks || project.tasks.length === 0) {
      return []
    }

    // First pass: create basic task objects
    const tasks = project.tasks.map(task => {
      const dueDate = task.dueDate ? new Date(task.dueDate) : null
      const createdDate = new Date(task.createdAt)
      
      // Calculate task timeline
      let startDate: Date
      let endDate: Date
      
      if (dueDate) {
        // If task has due date, estimate start date based on priority
        const estimatedDuration = getEstimatedDuration(task.priority)
        startDate = new Date(dueDate.getTime() - estimatedDuration * 24 * 60 * 60 * 1000)
        endDate = dueDate
      } else {
        // If no due date, use created date and estimate duration
        startDate = createdDate
        const estimatedDuration = getEstimatedDuration(task.priority)
        endDate = new Date(createdDate.getTime() + estimatedDuration * 24 * 60 * 60 * 1000)
      }

      // Calculate progress based on status
      const progress = getProgressFromStatus(task.status)
      
      // Calculate duration in days
      const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee?.name,
        startDate,
        endDate,
        duration,
        progress,
        color: statusColors[task.status] || '#94a3b8',
        dependencies: task.dependencies || [],
        level: 0
      }
    })

    // Second pass: calculate dependencies and adjust timelines
    const taskMap = new Map(tasks.map(task => [task.id, task]))
    
    // Calculate dependency levels and adjust start dates
    const calculateDependencies = (taskId: string, visited = new Set<string>()): number => {
      if (visited.has(taskId)) return 0 // Avoid circular dependencies
      visited.add(taskId)
      
      const task = taskMap.get(taskId)
      if (!task) return 0
      
      let maxLevel = 0
      for (const depId of task.dependencies) {
        const depLevel = calculateDependencies(depId, new Set(visited))
        maxLevel = Math.max(maxLevel, depLevel + 1)
        
        // Adjust start date based on dependency
        const depTask = taskMap.get(depId)
        if (depTask && depTask.endDate > task.startDate) {
          task.startDate = new Date(depTask.endDate.getTime() + 24 * 60 * 60 * 1000) // 1 day buffer
          task.endDate = new Date(task.startDate.getTime() + task.duration * 24 * 60 * 60 * 1000)
        }
      }
      
      task.level = maxLevel
      return maxLevel
    }
    
    // Calculate all dependencies
    tasks.forEach(task => calculateDependencies(task.id))
    
    // Sort by level and then by start date
    return tasks.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level
      return a.startDate.getTime() - b.startDate.getTime()
    })
  }, [project.tasks])

  // Generate timeline grid
  const timelineGrid = useMemo(() => {
    const { start, end } = projectTimeline
    
    // Extend timeline to cover all tasks, not just project dates
    let timelineStart = start
    let timelineEnd = end
    
    if (ganttTasks.length > 0) {
      const taskDates = ganttTasks.flatMap(task => [task.startDate, task.endDate])
      const minTaskDate = new Date(Math.min(...taskDates.map(d => d.getTime())))
      const maxTaskDate = new Date(Math.max(...taskDates.map(d => d.getTime())))
      
      // Extend timeline to include all tasks with some padding
      timelineStart = new Date(Math.min(timelineStart.getTime(), minTaskDate.getTime() - 7 * 24 * 60 * 60 * 1000)) // 7 days before
      timelineEnd = new Date(Math.max(timelineEnd.getTime(), maxTaskDate.getTime() + 7 * 24 * 60 * 60 * 1000)) // 7 days after
    }
    
    const days: Date[] = []
    const current = new Date(timelineStart)
    while (current <= timelineEnd) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }, [projectTimeline, ganttTasks])

  // Auto-scroll to show all tasks when component loads
  useEffect(() => {
    if (ganttTasks.length > 0 && timelineGrid.length > 0) {
      // Find the earliest and latest task dates
      const taskDates = ganttTasks.flatMap(task => [task.startDate, task.endDate])
      const minTaskDate = new Date(Math.min(...taskDates.map(d => d.getTime())))
      const maxTaskDate = new Date(Math.max(...taskDates.map(d => d.getTime())))
      
      // Calculate scroll position to center the tasks
      const timelineStart = timelineGrid[0]
      const totalTimelineDays = timelineGrid.length
      const taskStartOffset = Math.floor((minTaskDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24))
      const scrollPosition = Math.max(0, (taskStartOffset / totalTimelineDays) * 100 - 20) // 20% offset for better view
      
      // Apply scroll to all timeline containers
      setTimeout(() => {
        const timelineContainers = document.querySelectorAll('.gantt-timeline-container')
        timelineContainers.forEach(container => {
          if (container instanceof HTMLElement) {
            container.scrollLeft = (scrollPosition / 100) * container.scrollWidth
          }
        })
      }, 100)
    }
  }, [ganttTasks, timelineGrid])

  // Get estimated duration based on priority
  function getEstimatedDuration(priority: string): number {
    switch (priority) {
      case 'URGENT': return 1
      case 'HIGH': return 3
      case 'MEDIUM': return 7
      case 'LOW': return 14
      default: return 7
    }
  }

  // Get progress percentage based on status
  function getProgressFromStatus(status: string): number {
    switch (status) {
      case 'TODO': return 0
      case 'IN_PROGRESS': return 50
      case 'IN_REVIEW': return 80
      case 'DONE': return 100
      case 'BLOCKED': return 0
      default: return 0
    }
  }

  // Format date for display
  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  // Calculate task position and width
  function getTaskPosition(task: GanttTask) {
    if (timelineGrid.length === 0) {
      return { left: '0%', width: '100%' }
    }
    
    const timelineStart = timelineGrid[0]
    const totalDays = timelineGrid.length
    const taskStartOffset = Math.max(0, Math.floor((task.startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)))
    const taskWidth = Math.max(1, task.duration)
    
    return {
      left: `${(taskStartOffset / totalDays) * 100}%`,
      width: `${(taskWidth / totalDays) * 100}%`
    }
  }

  // Navigation functions
  const navigateTimeline = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7)
      else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() - 1)
      else newDate.setMonth(newDate.getMonth() - 3)
    } else {
      if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7)
      else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + 1)
      else newDate.setMonth(newDate.getMonth() + 3)
    }
    setCurrentDate(newDate)
  }

  const resetView = () => {
    setCurrentDate(new Date())
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateTimeline('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateTimeline('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetView}
            title="Go to today"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex rounded-md border">
            {(['week', 'month', 'quarter'] as const).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(mode)}
                className="rounded-none first:rounded-l-md last:rounded-r-md"
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Project Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Scroll indicator */}
            {timelineGrid.length > 10 && (
              <div className="text-xs text-muted-foreground text-center">
                ← Scroll horizontally to see the full timeline →
              </div>
            )}
            
            {/* Timeline Header */}
            <div className="flex">
              <div className="w-64 flex-shrink-0 border-r pr-4">
                <div className="text-sm font-medium text-muted-foreground">Tasks</div>
              </div>
              <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 gantt-timeline-container">
                <div className="flex min-w-max" style={{ minWidth: `${timelineGrid.length * 64}px` }}>
                  {timelineGrid.map((date, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0 w-16 text-center text-xs text-muted-foreground border-r last:border-r-0"
                    >
                      {formatDate(date)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tasks */}
            <div className="space-y-1">
              {ganttTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2" />
                  <p>No tasks available for timeline</p>
                </div>
              ) : (
                ganttTasks.map((task) => {
                const position = getTaskPosition(task)
                const isSelected = selectedTask === task.id
                return (
                  <div key={task.id} className="flex">
                    {/* Task Info */}
                    <div className="w-64 flex-shrink-0 border-r pr-4">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: task.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {task.title}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {task.status}
                            </Badge>
                            {task.assignee && (
                              <span className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                {task.assignee}
                              </span>
                            )}
                            {task.dependencies.length > 0 && (
                              <span className="flex items-center text-blue-600">
                                <Clock className="h-3 w-3 mr-1" />
                                {task.dependencies.length} deps
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Task Bar */}
                    <div className="flex-1 relative overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 gantt-timeline-container">
                      <div className="relative h-8" style={{ minWidth: `${timelineGrid.length * 64}px` }}>
                        <div
                          className={`absolute top-1 h-6 rounded cursor-pointer hover:opacity-80 transition-all ${
                            isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                          }`}
                          style={{
                            left: position.left,
                            width: position.width,
                            backgroundColor: task.color,
                            opacity: task.status === 'BLOCKED' ? 0.5 : 1,
                            marginLeft: `${task.level * 8}px` // Indent based on dependency level
                          }}
                          onClick={() => setSelectedTask(selectedTask === task.id ? null : task.id)}
                        >
                          {/* Progress indicator */}
                          <div
                            className="h-full bg-white bg-opacity-30 rounded"
                            style={{ width: `${task.progress}%` }}
                          />
                          
                          {/* Task duration label */}
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                            {task.duration}d
                          </div>
                        </div>
                        
                        {/* Dependency lines */}
                        {task.dependencies.map((depId, index) => {
                          const depTask = ganttTasks.find(t => t.id === depId)
                          if (!depTask) return null
                          
                          const depPosition = getTaskPosition(depTask)
                          const depEndX = parseFloat(depPosition.left) + parseFloat(depPosition.width)
                          const taskStartX = parseFloat(position.left)
                          
                          return (
                            <div
                              key={depId}
                              className="absolute top-0 h-0.5 bg-gray-400 opacity-60"
                              style={{
                                left: `${depEndX}%`,
                                width: `${taskStartX - depEndX}%`,
                                top: '50%',
                                transform: 'translateY(-50%)'
                              }}
                            />
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
                })
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center space-x-4 pt-4 border-t">
              <div className="text-sm font-medium text-muted-foreground">Status:</div>
              {Object.entries(statusColors).map(([status, color]) => (
                <div key={status} className="flex items-center space-x-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-muted-foreground">{status}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Details Panel */}
      {selectedTask && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Task Details</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTask(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const task = ganttTasks.find(t => t.id === selectedTask)
              if (!task) return null
              
              return (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-lg">{task.title}</h3>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge 
                        variant="outline" 
                        style={{ backgroundColor: task.color, color: 'white' }}
                      >
                        {task.status}
                      </Badge>
                      <Badge variant="outline">
                        {task.priority} Priority
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="font-medium text-muted-foreground">Start Date</label>
                      <p>{formatDate(task.startDate)}</p>
                    </div>
                    <div>
                      <label className="font-medium text-muted-foreground">End Date</label>
                      <p>{formatDate(task.endDate)}</p>
                    </div>
                    <div>
                      <label className="font-medium text-muted-foreground">Duration</label>
                      <p>{task.duration} days</p>
                    </div>
                    <div>
                      <label className="font-medium text-muted-foreground">Progress</label>
                      <p>{task.progress}%</p>
                    </div>
                  </div>
                  
                  {task.assignee && (
                    <div>
                      <label className="font-medium text-muted-foreground">Assignee</label>
                      <p className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        {task.assignee}
                      </p>
                    </div>
                  )}
                  
                  {task.dependencies.length > 0 && (
                    <div>
                      <label className="font-medium text-muted-foreground">Dependencies</label>
                      <div className="space-y-1">
                        {task.dependencies.map(depId => {
                          const depTask = ganttTasks.find(t => t.id === depId)
                          return depTask ? (
                            <div key={depId} className="flex items-center space-x-2 text-sm">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: depTask.color }}
                              />
                              <span>{depTask.title}</span>
                            </div>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
