"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart
} from 'recharts'
import { 
  TrendingUp, 
  Clock, 
  Target, 
  Loader2,
  Calendar,
  User,
  Tag,
  AlertTriangle
} from 'lucide-react'

interface VelocityData {
  week: string
  tasks: number
  points: number
}

interface VelocityReport {
  data: VelocityData[]
  totalTasks: number
  totalPoints: number
  averageTasksPerWeek: number
  averagePointsPerWeek: number
}

interface WorkInReviewTask {
  id: string
  title: string
  assignee: {
    id: string
    name: string
    email: string
  } | null
  epic: {
    id: string
    title: string
    color: string
  } | null
  milestone: {
    id: string
    title: string
    endDate: string
  } | null
  points: number | null
  daysInReview: number
  updatedAt: string
}

interface WorkInReviewReport {
  tasks: WorkInReviewTask[]
  totalTasks: number
  averageDaysInReview: number
}

interface BurnDownData {
  day: number
  ideal: number
  actual: number
  date: string
}

interface MilestoneBurndown {
  id: string
  title: string
  description: string | null
  startDate: string | null
  endDate: string | null
  totalPoints: number
  completedPoints: number
  remainingPoints: number
  completionPercentage: number
  totalTasks: number
  completedTasks: number
  burnDownData: BurnDownData[]
}

interface BurndownReport {
  milestones: MilestoneBurndown[]
  totalRemainingPoints: number
  totalCompletedPoints: number
  overallCompletionPercentage: number
}

interface ProjectReportsProps {
  projectId: string
}

export function ProjectReports({ projectId }: ProjectReportsProps) {
  const [velocityReport, setVelocityReport] = useState<VelocityReport | null>(null)
  const [workInReviewReport, setWorkInReviewReport] = useState<WorkInReviewReport | null>(null)
  const [burndownReport, setBurndownReport] = useState<BurndownReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('velocity')

  useEffect(() => {
    loadReports()
  }, [projectId])

  const loadReports = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/projects/${projectId}/reports?type=all`)
      if (response.ok) {
        const data = await response.json()
        setVelocityReport(data.velocity)
        setWorkInReviewReport(data.workInReview)
        setBurndownReport(data.burndown)
      } else {
        console.error('Failed to load reports:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDaysInReview = (days: number) => {
    if (days === 1) return '1 day'
    return `${days} days`
  }

  const getDaysInReviewColor = (days: number) => {
    if (days <= 3) return 'bg-green-100 text-green-800'
    if (days <= 7) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const formatCompletionPercentage = (percentage: number) => {
    return `${Math.round(percentage)}%`
  }

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-100 text-green-800'
    if (percentage >= 50) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="velocity" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Velocity</span>
          </TabsTrigger>
          <TabsTrigger value="review" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Work in Review</span>
          </TabsTrigger>
          <TabsTrigger value="burndown" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Burn-down</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="velocity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Velocity Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              {velocityReport && velocityReport.data.length > 0 ? (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{velocityReport.totalTasks}</div>
                      <div className="text-sm text-muted-foreground">Total Tasks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{velocityReport.totalPoints}</div>
                      <div className="text-sm text-muted-foreground">Total Points</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{velocityReport.averageTasksPerWeek.toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground">Avg Tasks/Week</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{velocityReport.averagePointsPerWeek.toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground">Avg Points/Week</div>
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Tasks Chart */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Tasks Completed per Week</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={velocityReport.data}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" />
                          <YAxis />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="tasks" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Points Chart */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Points Completed per Week</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={velocityReport.data}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="points" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No velocity data yet</h3>
                  <p className="text-muted-foreground">
                    Complete some tasks to see velocity trends.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Work in Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workInReviewReport && workInReviewReport.tasks.length > 0 ? (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{workInReviewReport.totalTasks}</div>
                      <div className="text-sm text-muted-foreground">Tasks in Review</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{workInReviewReport.averageDaysInReview.toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground">Avg Days in Review</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {workInReviewReport.tasks.filter(task => task.daysInReview > 7).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Over 7 Days</div>
                    </div>
                  </div>

                  {/* Tasks Table */}
                  <div className="border rounded-lg">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b">
                          <tr>
                            <th className="text-left p-3 font-medium">Task</th>
                            <th className="text-left p-3 font-medium">Assignee</th>
                            <th className="text-left p-3 font-medium">Epic</th>
                            <th className="text-left p-3 font-medium">Milestone</th>
                            <th className="text-left p-3 font-medium">Points</th>
                            <th className="text-left p-3 font-medium">Days in Review</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workInReviewReport.tasks.map((task) => (
                            <tr key={task.id} className="border-b hover:bg-muted/50">
                              <td className="p-3">
                                <div className="font-medium">{task.title}</div>
                              </td>
                              <td className="p-3">
                                {task.assignee ? (
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    <span>{task.assignee.name}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">Unassigned</span>
                                )}
                              </td>
                              <td className="p-3">
                                {task.epic ? (
                                  <Badge 
                                    variant="outline" 
                                    style={{ 
                                      backgroundColor: task.epic.color + '20',
                                      borderColor: task.epic.color,
                                      color: task.epic.color
                                    }}
                                  >
                                    {task.epic.title}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">No epic</span>
                                )}
                              </td>
                              <td className="p-3">
                                {task.milestone ? (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>{task.milestone.title}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">No milestone</span>
                                )}
                              </td>
                              <td className="p-3">
                                {task.points ? (
                                  <Badge variant="secondary">{task.points}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="p-3">
                                <Badge 
                                  className={getDaysInReviewColor(task.daysInReview)}
                                >
                                  {formatDaysInReview(task.daysInReview)}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No work in review</h3>
                  <p className="text-muted-foreground">
                    All tasks are moving smoothly through the review process.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="burndown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Burn-down Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              {burndownReport && burndownReport.milestones.length > 0 ? (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{burndownReport.milestones.length}</div>
                      <div className="text-sm text-muted-foreground">Active Milestones</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{burndownReport.totalRemainingPoints}</div>
                      <div className="text-sm text-muted-foreground">Remaining Points</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{burndownReport.totalCompletedPoints}</div>
                      <div className="text-sm text-muted-foreground">Completed Points</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {formatCompletionPercentage(burndownReport.overallCompletionPercentage)}
                      </div>
                      <div className="text-sm text-muted-foreground">Overall Progress</div>
                    </div>
                  </div>

                  {/* Milestone Cards */}
                  <div className="space-y-4">
                    {burndownReport.milestones.map((milestone) => (
                      <Card key={milestone.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{milestone.title}</CardTitle>
                            <Badge 
                              className={getCompletionColor(milestone.completionPercentage)}
                            >
                              {formatCompletionPercentage(milestone.completionPercentage)}
                            </Badge>
                          </div>
                          {milestone.description && (
                            <p className="text-sm text-muted-foreground">{milestone.description}</p>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Milestone Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center">
                                <div className="text-lg font-semibold">{milestone.totalPoints}</div>
                                <div className="text-sm text-muted-foreground">Total Points</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold">{milestone.completedPoints}</div>
                                <div className="text-sm text-muted-foreground">Completed</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold">{milestone.remainingPoints}</div>
                                <div className="text-sm text-muted-foreground">Remaining</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold">{milestone.completedTasks}/{milestone.totalTasks}</div>
                                <div className="text-sm text-muted-foreground">Tasks</div>
                              </div>
                            </div>

                            {/* Burn-down Chart */}
                            {milestone.burnDownData.length > 0 && (
                              <div>
                                <h4 className="text-md font-medium mb-3">Burn-down Chart</h4>
                                <ResponsiveContainer width="100%" height={200}>
                                  <AreaChart data={milestone.burnDownData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="day" />
                                    <YAxis />
                                    <Tooltip 
                                      labelFormatter={(value) => `Day ${value}`}
                                      formatter={(value, name) => [
                                        value, 
                                        name === 'ideal' ? 'Ideal' : 'Actual'
                                      ]}
                                    />
                                    <Area 
                                      type="monotone" 
                                      dataKey="ideal" 
                                      stackId="1" 
                                      stroke="#ef4444" 
                                      fill="#ef4444" 
                                      fillOpacity={0.3}
                                    />
                                    <Area 
                                      type="monotone" 
                                      dataKey="actual" 
                                      stackId="2" 
                                      stroke="#10b981" 
                                      fill="#10b981" 
                                      fillOpacity={0.6}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No active milestones</h3>
                  <p className="text-muted-foreground">
                    Create milestones to track burn-down progress.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
