"use client"

import React, { useState, useEffect, useRef } from 'react'
import { DragDropProvider } from './drag-drop-provider'
import { DroppableColumn } from './droppable-column'
import { TaskEditDialog } from '../tasks/task-edit-dialog'
import { DependencyManager } from '../tasks/dependency-manager'
import { CreateTaskDialog } from '../tasks/create-task-dialog'
import { useTaskSidebarStore } from '@/lib/stores/use-task-sidebar-store'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  LayoutGrid, 
  List, 
  Columns3, 
  Monitor,
  Tablet,
  Smartphone,
  Plus,
  Layers,
  Filter,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

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
  dependsOn: string[]
  blocks: string[]
  createdAt: string
  updatedAt: string
  epicId?: string
  epic?: {
    id: string
    title: string
    color?: string
  }
  milestoneId?: string
  milestone?: {
    id: string
    title: string
    startDate?: string
    endDate?: string
  }
  points?: number
  createdBy: {
    id: string
    name: string
    email: string
  }
  project: {
    id: string
    name: string
  }
  _count: {
    subtasks: number
    comments: number
  }
}

interface Epic {
  id: string
  title: string
  description?: string
  color?: string
  order: number
  createdAt: string
  updatedAt: string
}

interface Milestone {
  id: string
  title: string
  description?: string
  startDate?: string
  endDate?: string
  createdAt: string
  updatedAt: string
}

interface KanbanBoardProps {
  projectId: string
  workspaceId?: string
  onTasksUpdated?: () => void
  filteredTasks?: any[]
  epicId?: string // Add epicId prop for Epic-specific filtering
}

type ViewDensity = 'compact' | 'comfortable' | 'spacious'
type ScreenSize = 'desktop' | 'tablet' | 'mobile'
type GroupByMode = 'status' | 'epic'

const columns = [
  { id: 'todo', status: 'TODO' as const, title: 'To Do', color: 'bg-muted text-foreground' },
  { id: 'in-progress', status: 'IN_PROGRESS' as const, title: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { id: 'in-review', status: 'IN_REVIEW' as const, title: 'In Review', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'done', status: 'DONE' as const, title: 'Done', color: 'bg-green-100 text-green-800' },
  { id: 'blocked', status: 'BLOCKED' as const, title: 'Blocked', color: 'bg-red-100 text-red-800' },
]

export function KanbanBoard({ projectId, workspaceId, onTasksUpdated, filteredTasks, epicId }: KanbanBoardProps) {
  const { open, setOnTaskUpdate } = useTaskSidebarStore()
  const [tasks, setTasks] = useState<Task[]>([])
  const [epics, setEpics] = useState<Epic[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dependencyTaskId, setDependencyTaskId] = useState<string | null>(null)
  const [isDependencyManagerOpen, setIsDependencyManagerOpen] = useState(false)
  const [viewDensity, setViewDensity] = useState<ViewDensity>('comfortable')
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop')
  const [groupByMode, setGroupByMode] = useState<GroupByMode>('status')
  const [selectedMilestones, setSelectedMilestones] = useState<string[]>([])
  const [selectedEpicFilter, setSelectedEpicFilter] = useState<string | null>(null)
  const [isCreateEpicOpen, setIsCreateEpicOpen] = useState(false)
  const [newEpicTitle, setNewEpicTitle] = useState('')
  const [newEpicDescription, setNewEpicDescription] = useState('')
  const [newEpicColor, setNewEpicColor] = useState('#3B82F6')
  const [collapsedEpics, setCollapsedEpics] = useState<Set<string>>(new Set())
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [createTaskStatus, setCreateTaskStatus] = useState<'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'>('TODO')
  const [createTaskEpicId, setCreateTaskEpicId] = useState<string | null>(null)

  // Initialize tasks from filteredTasks prop if provided, otherwise load from API
  useEffect(() => {
    if (filteredTasks && filteredTasks.length > 0) {
      console.log('[Kanban] initializing tasks from filteredTasks prop', filteredTasks.length)
      const enrichedTasks = enrichTasksWithEpicData(filteredTasks, epics)
      setTasks(enrichedTasks)
      setIsLoading(false)
    } else {
      loadTasks()
    }
    loadEpics()
    loadMilestones()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, workspaceId, epicId]) // Add epicId to dependencies

  // Sync tasks state when filteredTasks prop changes (but don't override optimistic updates)
  // This only runs when filteredTasks prop changes, not on every render
  // We use a ref to track if we've made optimistic updates to avoid overwriting them
  const hasOptimisticUpdateRef = useRef(false)
  
  useEffect(() => {
    // Skip sync entirely if we have optimistic updates in progress
    if (hasOptimisticUpdateRef.current) {
      console.log('[Kanban] Skipping filteredTasks sync (optimistic update in progress)')
      return
    }
    
    if (filteredTasks && filteredTasks.length > 0) {
      console.log('[Kanban] filteredTasks prop changed, syncing to state', filteredTasks.length)
      setTasks(prevTasks => {
        // If we have no tasks, use filteredTasks
        if (prevTasks.length === 0) {
          return enrichTasksWithEpicData(filteredTasks, epics)
        }
        // Otherwise, merge: update existing tasks with prop data
        const propTaskMap = new Map(filteredTasks.map(t => [t.id, t]))
        return prevTasks.map(task => {
          const propTask = propTaskMap.get(task.id)
          // Use prop data if it exists, otherwise keep current task
          return propTask ? { ...task, ...propTask } : task
        })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTasks]) // Only depend on filteredTasks, not epics (to avoid loops)

  // Re-enrich tasks when epics are loaded (in case epics load after tasks)
  // This ensures tasks have epic data even if API response doesn't include it
  useEffect(() => {
    if (epics.length > 0 && tasks.length > 0) {
      // Check if any task needs enrichment
      const needsEnrichment = tasks.some(task => 
        task.epicId && !task.epic
      )
      
      if (needsEnrichment) {
        const enriched = enrichTasksWithEpicData(tasks, epics)
        setTasks(enriched)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epics]) // Only re-run when epics change, tasks dependency handled by loadTasks

  // Screen size detection
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width >= 1280) {
        setScreenSize('desktop')
      } else if (width >= 768) {
        setScreenSize('tablet')
      } else {
        setScreenSize('mobile')
      }
    }

    handleResize() // Initial check
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Enrich tasks with epic data if not already present from API
  // This is a fallback in case API response doesn't include epic relation
  // Note: With the API update, tasks should already include epic data, but this ensures consistency
  const enrichTasksWithEpicData = (tasksData: Task[], epicsData: Epic[]): Task[] => {
    if (!epicsData || epicsData.length === 0) {
      return tasksData
    }

    const epicMap = new Map<string, Epic>()
    epicsData.forEach(epic => {
      epicMap.set(epic.id, epic)
    })

    return tasksData.map(task => {
      // If task already has epic data from API, use it
      if (task.epic) {
        return task
      }

      // Otherwise, enrich from epics array
      if (task.epicId) {
        const epic = epicMap.get(task.epicId)
        if (epic) {
          return {
            ...task,
            epic: {
              id: epic.id,
              title: epic.title,
              color: epic.color || undefined
            }
          }
        }
      }

      return task
    })
  }

  const loadTasks = async (force = false) => {
    try {
      console.log('[Kanban] loadTasks called', 'force:', force, 'hasOptimisticUpdate:', hasOptimisticUpdateRef.current)
      // Don't overwrite state if we have optimistic updates in progress (unless forced)
      if (!force && hasOptimisticUpdateRef.current) {
        console.log('[Kanban] Skipping loadTasks - optimistic update in progress')
        return
      }
      setIsLoading(true)
      // Add epicId filter to the API call if provided
      const epicFilter = epicId ? `&epicId=${epicId}` : ''
      const response = await fetch(`/api/tasks?projectId=${projectId}&workspaceId=${workspaceId}${epicFilter}`)
      if (response.ok) {
        const data = await response.json()
        // Tasks should already include epic data from API, but enrich if needed as fallback
        const enrichedTasks = enrichTasksWithEpicData(data, epics)
        console.log('[Kanban] tasks set from loadTasks', enrichedTasks.length)
        setTasks(enrichedTasks)
      } else {
        console.error('[Kanban] Failed to load tasks:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('[Kanban] Error loading tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadEpics = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/epics`)
      if (response.ok) {
        const data = await response.json()
        setEpics(data)
        
        // Load saved collapse state or default to all collapsed for new users
        const savedCollapseState = loadCollapseStateFromStorage()
        if (savedCollapseState.size === 0) {
          // First time user - collapse all epics by default
          const allEpicIds = new Set<string>(data.map((epic: Epic) => epic.id))
          setCollapsedEpics(allEpicIds)
          saveCollapseStateToStorage(allEpicIds)
        } else {
          // Use saved state, but filter out epics that no longer exist
          const validEpicIds = new Set<string>(data.map((epic: Epic) => epic.id))
          const filteredCollapseState = new Set<string>(
            Array.from(savedCollapseState).filter(id => validEpicIds.has(id))
          )
          setCollapsedEpics(filteredCollapseState)
        }
      } else {
        console.error('Failed to load epics:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading epics:', error)
    }
  }

  const loadMilestones = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/milestones`)
      if (response.ok) {
        const data = await response.json()
        setMilestones(data)
      } else {
        console.error('Failed to load milestones:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading milestones:', error)
    }
  }

  const createEpic = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/epics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newEpicTitle,
          description: newEpicDescription,
          color: newEpicColor,
        }),
      })

      if (response.ok) {
        const newEpic = await response.json()
        setEpics(prev => [...prev, newEpic])
        setNewEpicTitle('')
        setNewEpicDescription('')
        setNewEpicColor('#3B82F6')
        setIsCreateEpicOpen(false)
        onTasksUpdated?.()
      } else {
        console.error('Failed to create epic:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error creating epic:', error)
    }
  }

  const handleTaskMove = async (taskId: string, newStatus: string, newOrder?: number) => {
    const task = tasks.find(t => t.id === taskId)
    const fromStatus = task?.status
    console.log('[Kanban] handleTaskMove start', { taskId, fromStatus, toStatus: newStatus })
    console.log('[Kanban] tasks length before update', tasks.length)
    
    // Mark that we're making an optimistic update to prevent prop sync from overwriting it
    // Set this BEFORE the state update to ensure it's active immediately
    hasOptimisticUpdateRef.current = true
    
    try {
      // Optimistically update UI immediately before API call
      // Use functional update to avoid stale closure
      setTasks(prevTasks => {
        const updated = prevTasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus as any } : task
        )
        console.log('[Kanban] tasks length after optimistic update', updated.length)
        console.log('[Kanban] Updated task status:', updated.find(t => t.id === taskId)?.status)
        return updated
      })

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Update with full task data from API response to ensure consistency
        const updatedTask = await response.json()
        console.log('[Kanban] API response received, updating task', updatedTask.id, 'status:', updatedTask.status)
        setTasks(prevTasks => {
          const final = prevTasks.map(task =>
            task.id === taskId ? { ...task, ...updatedTask } : task
          )
          console.log('[Kanban] Final task status after API update:', final.find(t => t.id === taskId)?.status)
          return final
        })
        // Keep the flag set for a bit longer to prevent any late-arriving prop updates
        setTimeout(() => {
          hasOptimisticUpdateRef.current = false
          console.log('[Kanban] Optimistic update flag reset')
        }, 2000) // Increased delay to prevent overwrites
        // Don't call onTasksUpdated for status changes - we handle it optimistically
        // onTasksUpdated?.() // Commented out to prevent parent reload from overwriting state
      } else {
        console.error('[Kanban] Task move failed:', response.status, response.statusText)
        // Revert optimistic update and reload tasks if update failed (force reload)
        hasOptimisticUpdateRef.current = false
        loadTasks(true)
      }
    } catch (error) {
      console.error('[Kanban] Error moving task:', error)
      // Revert optimistic update and reload tasks on error (force reload)
      hasOptimisticUpdateRef.current = false
      loadTasks(true)
    }
  }

  const handleTaskReorder = async (taskId: string, newOrder: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order: newOrder }),
      })

      if (response.ok) {
        // Reload tasks to get updated order (force reload since this is not a status change)
        loadTasks(true)
      }
    } catch (error) {
      console.error('Error reordering task:', error)
    }
  }

  const handleEditTask = (task: Task) => {
    open(task.id)
  }

  const handleTaskUpdate = (updatedTask: Task) => {
    console.log('[Kanban] handleTaskUpdate', updatedTask.id, 'new status:', updatedTask.status)
    // Mark that we're making an optimistic update
    hasOptimisticUpdateRef.current = true
    // Update local state immediately with the updated task
    setTasks(prevTasks => {
      const updated = prevTasks.map(task =>
        task.id === updatedTask.id ? { ...task, ...updatedTask, status: updatedTask.status } : task
      )
      console.log('[Kanban] tasks updated in handleTaskUpdate', updated.length)
      return updated
    })
    // Reset the optimistic update flag after a delay
    setTimeout(() => {
      hasOptimisticUpdateRef.current = false
    }, 500)
    // Don't call onTasksUpdated - we handle it optimistically to prevent parent reload
    // onTasksUpdated?.() // Commented out to prevent parent reload from overwriting state
  }

  // Register handleTaskUpdate with the task sidebar store so TaskSidebar can notify us
  useEffect(() => {
    setOnTaskUpdate(handleTaskUpdate)
    return () => {
      setOnTaskUpdate(() => {}) // Cleanup: set empty callback
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  const handleManageDependencies = (taskId: string) => {
    setDependencyTaskId(taskId)
    setIsDependencyManagerOpen(true)
  }

  const handleDependenciesUpdated = () => {
    loadTasks() // Reload tasks to get updated dependency info
    // Notify parent component that tasks were updated
    onTasksUpdated?.()
  }

  const handleAddTask = (status: string, epicIdForTask?: string) => {
    setCreateTaskStatus(status as 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED')
    setCreateTaskEpicId(epicIdForTask || epicId || null)
    setIsCreateTaskOpen(true)
  }

  const handleTaskCreated = (task: any) => {
    // Add the new task to the local state optimistically
    hasOptimisticUpdateRef.current = true
    setTasks(prevTasks => [...prevTasks, task])
    // Reset the optimistic update flag after a delay
    setTimeout(() => {
      hasOptimisticUpdateRef.current = false
    }, 2000)
    // Optionally reload tasks to ensure consistency
    loadTasks()
  }

  // Helper functions for grouping and filtering
  const getTasksForEpic = (epicId: string) => {
    return displayTasks.filter(task => task.epicId === epicId)
  }

  const getTasksForColumn = (status: string) => {
    return displayTasks.filter(task => task.status === status)
  }

  const getEpicProgress = (epicId: string) => {
    const epicTasks = getTasksForEpic(epicId)
    const totalTasks = epicTasks.length
    const completedTasks = epicTasks.filter(task => task.status === 'DONE').length
    return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  }

  const toggleMilestoneFilter = (milestoneId: string) => {
    setSelectedMilestones(prev => 
      prev.includes(milestoneId) 
        ? prev.filter(id => id !== milestoneId)
        : [...prev, milestoneId]
    )
  }

  const clearMilestoneFilters = () => {
    setSelectedMilestones([])
  }

  const toggleEpicCollapse = (epicId: string) => {
    setCollapsedEpics(prev => {
      const newSet = new Set(prev)
      if (newSet.has(epicId)) {
        newSet.delete(epicId)
      } else {
        newSet.add(epicId)
      }
      // Persist to localStorage
      saveCollapseStateToStorage(newSet)
      return newSet
    })
  }

  const saveCollapseStateToStorage = (collapsedSet: Set<string>) => {
    try {
      const collapsedArray = Array.from(collapsedSet)
      localStorage.setItem(`epic-collapse-${projectId}`, JSON.stringify(collapsedArray))
    } catch (error) {
      console.error('Failed to save collapse state to localStorage:', error)
    }
  }

  const loadCollapseStateFromStorage = (): Set<string> => {
    try {
      const saved = localStorage.getItem(`epic-collapse-${projectId}`)
      if (saved) {
        const collapsedArray = JSON.parse(saved)
        return new Set(collapsedArray)
      }
    } catch (error) {
      console.error('Failed to load collapse state from localStorage:', error)
    }
    return new Set()
  }

  // Always use tasks state for rendering (never render directly from props)
  // Apply milestone and epic filtering and ensure tasks have project information and dependsOn array
  const displayTasks = tasks.map(task => ({
    ...task,
    project: task.project || { id: projectId },
    dependsOn: task.dependsOn || []
  })).filter(task => {
    // Apply milestone filtering
    if (selectedMilestones.length > 0) {
      if (!task.milestoneId || !selectedMilestones.includes(task.milestoneId)) {
        return false
      }
    }
    
    // Apply epic filtering
    if (selectedEpicFilter !== null) {
      if (selectedEpicFilter === 'none') {
        // Filter for tasks with no epic
        return !task.epicId
      } else {
        // Filter for specific epic
        return task.epicId === selectedEpicFilter
      }
    }
    
    return true
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <DragDropProvider
      onTaskMove={handleTaskMove}
      onTaskReorder={handleTaskReorder}
    >
      {/* Responsive Container */}
      <div className={`p-8 bg-background ${
        screenSize === 'desktop' 
          ? 'max-w-[1600px] mx-auto' // Appropriate maximum width for 27" and smaller monitors
          : screenSize === 'tablet' 
            ? 'max-w-7xl mx-auto' 
            : 'max-w-full px-4'
      }`}>
        {/* Board Toolbar */}
        {groupByMode === 'status' && (
          <div className="mb-6 flex items-center justify-between flex-wrap gap-4 pb-4 border-b">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Epic Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={selectedEpicFilter || 'all'}
                  onValueChange={(value) => {
                    setSelectedEpicFilter(value === 'all' ? null : value)
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Epic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Epics</SelectItem>
                    {epics.map((epic) => (
                      <SelectItem key={epic.id} value={epic.id}>
                        {epic.title}
                      </SelectItem>
                    ))}
                    <SelectItem value="none">No Epic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* View Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewDensity === 'compact' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewDensity('compact')}
              >
                <Columns3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewDensity === 'comfortable' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewDensity('comfortable')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewDensity === 'spacious' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewDensity('spacious')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        {groupByMode === 'status' ? (
          <div className={`grid gap-4 ${
            screenSize === 'desktop' 
              ? 'grid-cols-5' // Fixed 5 columns for desktop to show all statuses
              : screenSize === 'tablet' 
                ? 'grid-cols-3' 
                : 'grid-cols-1'
          }`}>
            {columns.map((column) => (
              <DroppableColumn
                key={column.id}
                column={column}
                tasks={getTasksForColumn(column.status)}
                onEditTask={handleEditTask}
                onManageDependencies={handleManageDependencies}
                onAddTask={handleAddTask}
                viewDensity={viewDensity}
                screenSize={screenSize}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Epic Lanes */}
            {epics.map((epic) => {
              const epicTasks = getTasksForEpic(epic.id)
              const progress = getEpicProgress(epic.id)
              const completedTasks = epicTasks.filter(task => task.status === 'DONE').length
              const totalTasks = epicTasks.length

              return (
                <div key={epic.id} className="border rounded-lg">
                  {/* Epic Header */}
                  <div className="p-4 border-b bg-muted">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleEpicCollapse(epic.id)}
                          className="h-6 w-6 p-0 hover:bg-muted"
                        >
                          {collapsedEpics.has(epic.id) ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: epic.color || '#3B82F6' }}
                        />
                        <h3 className="font-semibold text-gray-900">{epic.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {completedTasks}/{totalTasks} tasks
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
                        <Progress value={progress} className="w-20" />
                      </div>
                    </div>
                    {epic.description && (
                      <p className="text-sm text-gray-600 mt-2">{epic.description}</p>
                    )}
                  </div>

                  {/* Epic Tasks Grid */}
                  {!collapsedEpics.has(epic.id) && (
                    <div className="p-4">
                      <div className={`grid gap-4 ${
                        screenSize === 'desktop' 
                          ? 'grid-cols-5' 
                          : screenSize === 'tablet' 
                            ? 'grid-cols-3' 
                            : 'grid-cols-1'
                      }`}>
                        {columns.map((column) => {
                          const columnTasks = epicTasks.filter(task => task.status === column.status)
                          return (
                            <DroppableColumn
                              key={`${epic.id}-${column.id}`}
                              column={column}
                              tasks={columnTasks}
                              onEditTask={handleEditTask}
                              onManageDependencies={handleManageDependencies}
                              onAddTask={handleAddTask}
                              viewDensity={viewDensity}
                              screenSize={screenSize}
                              epicId={epic.id}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Unassigned Tasks */}
            {(() => {
              const unassignedTasks = displayTasks.filter(task => !task.epicId)
              if (unassignedTasks.length === 0) return null

              return (
                <div className="border rounded-lg">
                  <div className="p-4 border-b bg-muted">
                    <h3 className="font-semibold text-gray-900">Unassigned Tasks</h3>
                  </div>
                  <div className="p-4">
                    <div className={`grid gap-4 ${
                      screenSize === 'desktop' 
                        ? 'grid-cols-5' 
                        : screenSize === 'tablet' 
                          ? 'grid-cols-3' 
                          : 'grid-cols-1'
                    }`}>
                      {columns.map((column) => {
                        const columnTasks = unassignedTasks.filter(task => task.status === column.status)
                        return (
                          <DroppableColumn
                            key={`unassigned-${column.id}`}
                            column={column}
                            tasks={columnTasks}
                            onEditTask={handleEditTask}
                            onManageDependencies={handleManageDependencies}
                            onAddTask={handleAddTask}
                            viewDensity={viewDensity}
                            screenSize={screenSize}
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>


      {/* Dependency Manager */}
      {dependencyTaskId && (
        <DependencyManager
          taskId={dependencyTaskId}
          projectId={projectId}
          isOpen={isDependencyManagerOpen}
          onClose={() => setIsDependencyManagerOpen(false)}
          onDependenciesUpdated={handleDependenciesUpdated}
        />
      )}

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        projectId={projectId}
        defaultStatus={createTaskStatus}
        defaultEpicId={createTaskEpicId}
        onTaskCreated={handleTaskCreated}
      />
    </DragDropProvider>
  )
}
