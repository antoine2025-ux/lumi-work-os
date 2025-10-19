"use client"

import React, { useState, useEffect } from 'react'
import { DragDropProvider } from './drag-drop-provider'
import { DroppableColumn } from './droppable-column'
import { TaskEditDialog } from '../tasks/task-edit-dialog'
import { DependencyManager } from '../tasks/dependency-manager'
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
  X
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
}

type ViewDensity = 'compact' | 'comfortable' | 'spacious'
type ScreenSize = 'desktop' | 'tablet' | 'mobile'
type GroupByMode = 'status' | 'epic'

const columns = [
  { id: 'todo', status: 'TODO' as const, title: 'To Do', color: 'bg-gray-100 text-gray-800' },
  { id: 'in-progress', status: 'IN_PROGRESS' as const, title: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { id: 'in-review', status: 'IN_REVIEW' as const, title: 'In Review', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'done', status: 'DONE' as const, title: 'Done', color: 'bg-green-100 text-green-800' },
  { id: 'blocked', status: 'BLOCKED' as const, title: 'Blocked', color: 'bg-red-100 text-red-800' },
]

export function KanbanBoard({ projectId, workspaceId = 'cmgl0f0wa00038otlodbw5jhn', onTasksUpdated, filteredTasks }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [epics, setEpics] = useState<Epic[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [dependencyTaskId, setDependencyTaskId] = useState<string | null>(null)
  const [isDependencyManagerOpen, setIsDependencyManagerOpen] = useState(false)
  const [viewDensity, setViewDensity] = useState<ViewDensity>('comfortable')
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop')
  const [groupByMode, setGroupByMode] = useState<GroupByMode>('status')
  const [selectedMilestones, setSelectedMilestones] = useState<string[]>([])
  const [isCreateEpicOpen, setIsCreateEpicOpen] = useState(false)
  const [newEpicTitle, setNewEpicTitle] = useState('')
  const [newEpicDescription, setNewEpicDescription] = useState('')
  const [newEpicColor, setNewEpicColor] = useState('#3B82F6')

  useEffect(() => {
    loadTasks()
    loadEpics()
    loadMilestones()
  }, [projectId, workspaceId])

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

  const loadTasks = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/tasks?projectId=${projectId}&workspaceId=${workspaceId}`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      } else {
        console.error('Failed to load tasks:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
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
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Update local state optimistically
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === taskId ? { ...task, status: newStatus as any } : task
          )
        )
        // Notify parent component that tasks were updated
        onTasksUpdated?.()
      } else {
        console.error('Task move failed:', response.status, response.statusText)
        // Reload tasks if update failed
        loadTasks()
      }
    } catch (error) {
      console.error('Error moving task:', error)
      loadTasks()
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
        // Reload tasks to get updated order
        loadTasks()
      }
    } catch (error) {
      console.error('Error reordering task:', error)
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
    // Notify parent component that tasks were updated
    onTasksUpdated?.()
  }

  const handleManageDependencies = (taskId: string) => {
    setDependencyTaskId(taskId)
    setIsDependencyManagerOpen(true)
  }

  const handleDependenciesUpdated = () => {
    loadTasks() // Reload tasks to get updated dependency info
    // Notify parent component that tasks were updated
    onTasksUpdated?.()
  }

  const handleAddTask = (status: string) => {
    // Navigate to the new task page with the status pre-filled
    window.location.href = `/projects/${projectId}/tasks/new?status=${status}`
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

  // Use filtered tasks if provided, otherwise use loaded tasks
  // Apply milestone filtering and ensure filtered tasks have project information and dependsOn array
  const displayTasks = (filteredTasks ? 
    filteredTasks.map(task => ({
      ...task,
      project: task.project || { id: projectId },
      dependsOn: task.dependsOn || []
    })) : 
    tasks
  ).filter(task => {
    // Apply milestone filtering
    if (selectedMilestones.length > 0) {
      return task.milestoneId && selectedMilestones.includes(task.milestoneId)
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
      {/* Controls Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Group By Toggle */}
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-gray-500" />
              <Select value={groupByMode} onValueChange={(value: GroupByMode) => setGroupByMode(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">Group by Status</SelectItem>
                  <SelectItem value="epic">Group by Epic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Milestone Filters */}
            {milestones.length > 0 && (
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500">Milestones:</span>
                <div className="flex items-center space-x-2">
                  {milestones.map((milestone) => (
                    <Badge
                      key={milestone.id}
                      variant={selectedMilestones.includes(milestone.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleMilestoneFilter(milestone.id)}
                    >
                      {milestone.title}
                    </Badge>
                  ))}
                  {selectedMilestones.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearMilestoneFilters}
                      className="h-6 px-2 text-xs"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Add Epic Button */}
          {groupByMode === 'epic' && (
            <Dialog open={isCreateEpicOpen} onOpenChange={setIsCreateEpicOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Epic</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Epic</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="epic-title">Title</Label>
                    <Input
                      id="epic-title"
                      value={newEpicTitle}
                      onChange={(e) => setNewEpicTitle(e.target.value)}
                      placeholder="Epic title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="epic-description">Description</Label>
                    <Textarea
                      id="epic-description"
                      value={newEpicDescription}
                      onChange={(e) => setNewEpicDescription(e.target.value)}
                      placeholder="Epic description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="epic-color">Color</Label>
                    <Input
                      id="epic-color"
                      type="color"
                      value={newEpicColor}
                      onChange={(e) => setNewEpicColor(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateEpicOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createEpic} disabled={!newEpicTitle.trim()}>
                      Create Epic
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Responsive Container */}
      <div className={`p-8 ${
        screenSize === 'desktop' 
          ? 'max-w-[1600px] mx-auto' // Appropriate maximum width for 27" and smaller monitors
          : screenSize === 'tablet' 
            ? 'max-w-7xl mx-auto' 
            : 'max-w-full px-4'
      }`}>
        {groupByMode === 'status' ? (
          <div className={`grid gap-6 ${
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
                  <div className="p-4 border-b bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
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
                </div>
              )
            })}

            {/* Unassigned Tasks */}
            {(() => {
              const unassignedTasks = displayTasks.filter(task => !task.epicId)
              if (unassignedTasks.length === 0) return null

              return (
                <div className="border rounded-lg">
                  <div className="p-4 border-b bg-gray-50">
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

      {/* Task Edit Dialog */}
      <TaskEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        task={editingTask}
        onSave={handleTaskUpdate}
      />

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
    </DragDropProvider>
  )
}
