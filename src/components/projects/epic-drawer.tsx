"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Calendar, FileText, Link as LinkIcon, GanttChart, Sparkles } from 'lucide-react'
import { TaskEditDialog } from '@/components/tasks/task-edit-dialog'

interface Epic {
  id: string
  title: string
  description?: string
  color?: string
  createdAt: string
  updatedAt: string
}

interface Task {
  id: string
  title: string
  description?: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  assigneeId?: string
  assignee?: {
    id: string
    name: string
    email: string
  }
  dueDate?: string
  dependsOn?: string[]
  blocks?: string[]
  epicId?: string
  createdAt: string
  updatedAt: string
}

interface EpicDrawerProps {
  epic: Epic | null
  isOpen: boolean
  onClose: () => void
  projectId: string
  workspaceId?: string
  colors: {
    text: string
    textSecondary: string
    textMuted: string
    border: string
    surface: string
    background: string
    primary: string
  }
}

export function EpicDrawer({ epic, isOpen, onClose, projectId, workspaceId, colors }: EpicDrawerProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (epic && isOpen) {
      loadTasks()
    }
  }, [epic, isOpen])

  const loadTasks = async () => {
    if (!epic) return
    try {
      setIsLoading(true)
      const response = await fetch(`/api/tasks?projectId=${projectId}&workspaceId=${workspaceId}`)
      if (response.ok) {
        const data = await response.json()
        setTasks(data.filter((task: Task) => task.epicId === epic.id))
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getEpicStats = () => {
    if (!epic) return { total: 0, completed: 0, blocked: 0, overdue: 0, assignees: [] }
    
    const epicTasks = tasks
    const totalTasks = epicTasks.length
    const completedTasks = epicTasks.filter(task => task.status === 'DONE').length
    const blockedTasks = epicTasks.filter(task => task.status === 'BLOCKED' || (task.dependsOn && task.dependsOn.length > 0)).length
    
    const now = new Date()
    const overdueTasks = epicTasks.filter(task => {
      if (!task.dueDate) return false
      return new Date(task.dueDate) < now && task.status !== 'DONE'
    }).length

    const assignees = Array.from(
      new Map(
        epicTasks
          .filter(task => task.assignee)
          .map(task => [task.assignee!.id, task.assignee!])
      ).values()
    )

    return {
      total: totalTasks,
      completed: completedTasks,
      blocked: blockedTasks,
      overdue: overdueTasks,
      assignees
    }
  }

  const getEpicProgress = () => {
    const stats = getEpicStats()
    if (stats.total === 0) return 0
    return (stats.completed / stats.total) * 100
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (!epic) return null

  const stats = getEpicStats()
  const progress = getEpicProgress()

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" style={{ backgroundColor: colors.surface }}>
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: epic.color || colors.primary }}
              />
              <DialogTitle style={{ color: colors.text }}>{epic.title}</DialogTitle>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              {/* Epic Overview */}
              <TabsContent value="overview" className="space-y-6 mt-0">
                {/* Description */}
                {epic.description && (
                  <div>
                    <h3 className="text-sm font-medium mb-2" style={{ color: colors.text }}>Description</h3>
                    <p className="text-sm" style={{ color: colors.textSecondary }}>{epic.description}</p>
                  </div>
                )}

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium" style={{ color: colors.text }}>Progress</h3>
                    <span className="text-sm" style={{ color: colors.textMuted }}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {/* Summary Metrics */}
                <div>
                  <h3 className="text-sm font-medium mb-3" style={{ color: colors.text }}>Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded border" style={{ borderColor: colors.border }}>
                      <div className="text-xs mb-1" style={{ color: colors.textMuted }}>Total Tasks</div>
                      <div className="text-lg font-semibold" style={{ color: colors.text }}>{stats.total}</div>
                    </div>
                    <div className="p-3 rounded border" style={{ borderColor: colors.border }}>
                      <div className="text-xs mb-1" style={{ color: colors.textMuted }}>Completed</div>
                      <div className="text-lg font-semibold" style={{ color: colors.text }}>{stats.completed}</div>
                    </div>
                    <div className="p-3 rounded border" style={{ borderColor: colors.border }}>
                      <div className="text-xs mb-1 flex items-center gap-1" style={{ color: colors.textMuted }}>
                        <AlertTriangle className="h-3 w-3" />
                        Blocked
                      </div>
                      <div className="text-lg font-semibold" style={{ color: '#ef4444' }}>{stats.blocked}</div>
                    </div>
                    <div className="p-3 rounded border" style={{ borderColor: colors.border }}>
                      <div className="text-xs mb-1" style={{ color: colors.textMuted }}>Overdue</div>
                      <div className="text-lg font-semibold" style={{ color: stats.overdue > 0 ? '#ef4444' : colors.text }}>
                        {stats.overdue}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assignees */}
                {stats.assignees.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2" style={{ color: colors.text }}>Assignees</h3>
                    <div className="flex flex-wrap gap-2">
                      {stats.assignees.map((assignee) => (
                        <div
                          key={assignee.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded border"
                          style={{ borderColor: colors.border }}
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                            style={{ 
                              backgroundColor: colors.primary + '20',
                              color: colors.primary
                            }}
                          >
                            {assignee.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm" style={{ color: colors.text }}>{assignee.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Insights Placeholder */}
                <div className="p-4 rounded border border-dashed" style={{ borderColor: colors.border }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4" style={{ color: colors.textMuted }} />
                    <h3 className="text-sm font-medium" style={{ color: colors.text }}>AI Insights</h3>
                  </div>
                  <p className="text-xs" style={{ color: colors.textMuted }}>Coming soon</p>
                </div>
              </TabsContent>

              {/* Epic Timeline */}
              <TabsContent value="timeline" className="mt-0">
                <div className="p-8 text-center border border-dashed rounded" style={{ borderColor: colors.border }}>
                  <GanttChart className="h-12 w-12 mx-auto mb-3" style={{ color: colors.textMuted }} />
                  <h3 className="text-sm font-medium mb-1" style={{ color: colors.text }}>Timeline View</h3>
                  <p className="text-xs" style={{ color: colors.textMuted }}>
                    Gantt chart showing tasks for this epic (coming soon)
                  </p>
                </div>
              </TabsContent>

              {/* Epic Tasks */}
              <TabsContent value="tasks" className="mt-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b" style={{ borderColor: colors.border }}>
                        <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: colors.textSecondary }}>
                          Task
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: colors.textSecondary }}>
                          Status
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: colors.textSecondary }}>
                          Priority
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: colors.textSecondary }}>
                          Assignee
                        </th>
                        <th className="text-left py-2 px-3 text-xs font-medium" style={{ color: colors.textSecondary }}>
                          Due Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-sm" style={{ color: colors.textMuted }}>
                            No tasks in this epic
                          </td>
                        </tr>
                      ) : (
                        tasks.map((task) => {
                          const isBlocked = task.status === 'BLOCKED' || (task.dependsOn && task.dependsOn.length > 0)
                          return (
                            <tr
                              key={task.id}
                              onClick={() => {
                                setEditingTask(task)
                                setIsEditDialogOpen(true)
                              }}
                              className="border-b cursor-pointer hover:bg-opacity-50 transition-colors"
                              style={{ borderColor: colors.border }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = colors.border + '20'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent'
                              }}
                            >
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  {isBlocked && (
                                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#ef4444' }} />
                                  )}
                                  <span className="text-sm font-medium" style={{ color: colors.text }}>
                                    {task.title}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <Badge variant="outline" className="text-xs">
                                  {task.status.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className="py-2 px-3">
                                <span className="text-xs" style={{ color: colors.textSecondary }}>
                                  {task.priority}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                {task.assignee ? (
                                  <span className="text-xs" style={{ color: colors.textSecondary }}>
                                    {task.assignee.name}
                                  </span>
                                ) : (
                                  <span className="text-xs" style={{ color: colors.textMuted }}>-</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {task.dueDate ? (
                                  <span className="text-xs" style={{ color: colors.textSecondary }}>
                                    {formatDate(task.dueDate)}
                                  </span>
                                ) : (
                                  <span className="text-xs" style={{ color: colors.textMuted }}>-</span>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* Epic Notes */}
              <TabsContent value="notes" className="mt-0">
                <div className="p-8 text-center border border-dashed rounded" style={{ borderColor: colors.border }}>
                  <FileText className="h-12 w-12 mx-auto mb-3" style={{ color: colors.textMuted }} />
                  <h3 className="text-sm font-medium mb-1" style={{ color: colors.text }}>Epic Notes</h3>
                  <p className="text-xs mb-4" style={{ color: colors.textMuted }}>
                    Link a wiki page to describe this epic
                  </p>
                  <Button variant="outline" size="sm">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Link Wiki Page
                  </Button>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Task Edit Dialog */}
      {editingTask && (
        <TaskEditDialog
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false)
            setEditingTask(null)
            loadTasks()
          }}
          task={editingTask}
          onSave={() => {
            loadTasks()
          }}
          workspaceId={workspaceId}
        />
      )}
    </>
  )
}




