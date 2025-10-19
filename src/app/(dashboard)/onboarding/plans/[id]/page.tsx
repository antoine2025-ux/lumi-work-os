'use client'

import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/onboarding/progress-bar'
import { TaskList } from '@/components/onboarding/task-list'
import { ArrowLeft, Calendar, User, Clock } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

// Mock data - in a real app, this would come from API calls
const mockPlan = {
  id: '1',
  name: 'Software Engineer - 30 Day Plan',
  status: 'ACTIVE' as const,
  progressPct: 65,
  startDate: '2024-01-15T00:00:00Z',
  endDate: null,
  employee: {
    name: 'John Doe',
    email: 'john.doe@company.com',
  },
  template: {
    name: 'Software Engineer - 30 Day Plan',
    durationDays: 30,
  },
  tasks: [
    {
      id: '1',
      title: 'Complete HR paperwork',
      description: 'Fill out all required HR forms and documentation',
      status: 'DONE' as const,
      dueDate: '2024-01-16T00:00:00Z',
      order: 1,
    },
    {
      id: '2',
      title: 'Set up development environment',
      description: 'Install and configure development tools and IDE',
      status: 'DONE' as const,
      dueDate: '2024-01-17T00:00:00Z',
      order: 2,
    },
    {
      id: '3',
      title: 'Review codebase architecture',
      description: 'Study the main codebase structure and architecture patterns',
      status: 'PENDING' as const,
      dueDate: '2024-01-20T00:00:00Z',
      order: 3,
    },
    {
      id: '4',
      title: 'Complete first code review',
      description: 'Participate in code review process and provide feedback',
      status: 'PENDING' as const,
      dueDate: '2024-01-25T00:00:00Z',
      order: 4,
    },
    {
      id: '5',
      title: 'Meet with team members',
      description: 'Schedule 1:1 meetings with team members',
      status: 'PENDING' as const,
      dueDate: '2024-01-22T00:00:00Z',
      order: 5,
    },
    {
      id: '6',
      title: 'Complete security training',
      description: 'Complete mandatory security awareness training',
      status: 'DONE' as const,
      dueDate: '2024-01-18T00:00:00Z',
      order: 6,
    },
    {
      id: '7',
      title: 'Set up project access',
      description: 'Get access to all necessary project repositories and tools',
      status: 'DONE' as const,
      dueDate: '2024-01-17T00:00:00Z',
      order: 7,
    },
    {
      id: '8',
      title: 'Attend team standup',
      description: 'Participate in daily team standup meetings',
      status: 'IN_PROGRESS' as const,
      dueDate: '2024-01-19T00:00:00Z',
      order: 8,
    },
  ],
}

function PlanView() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Active</Badge>
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
      case 'ON_HOLD':
        return <Badge variant="secondary">On Hold</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const completedTasks = mockPlan.tasks.filter(task => task.status === 'DONE').length
  const totalTasks = mockPlan.tasks.length
  const daysSinceStart = Math.ceil((new Date().getTime() - new Date(mockPlan.startDate).getTime()) / (1000 * 60 * 60 * 24))

  const handleTaskUpdate = async (taskId: string, updates: { status?: string; title?: string; description?: string }) => {
    console.log('Updating task:', taskId, updates)
    // In a real app, this would make an API call to update the task
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/onboarding">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Onboarding
          </Link>
        </Button>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">{mockPlan.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(mockPlan.status)}
                    <span className="text-sm text-muted-foreground">
                      Started {format(new Date(mockPlan.startDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{mockPlan.progressPct}%</div>
                  <p className="text-sm text-muted-foreground">Complete</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ProgressBar value={mockPlan.progressPct} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskList
                tasks={mockPlan.tasks}
                onTaskUpdate={handleTaskUpdate}
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Plan Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{mockPlan.employee.name}</p>
                  <p className="text-sm text-muted-foreground">{mockPlan.employee.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{mockPlan.template?.durationDays} days</p>
                  <p className="text-sm text-muted-foreground">Duration</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{daysSinceStart} days</p>
                  <p className="text-sm text-muted-foreground">Since start</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Progress Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Tasks Completed</span>
                  <span className="font-medium">{completedTasks}/{totalTasks}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Remaining Tasks</span>
                  <span className="font-medium">{totalTasks - completedTasks}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Completion Rate</span>
                  <span className="font-medium">{Math.round((completedTasks / totalTasks) * 100)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline">
                Edit Plan
              </Button>
              {mockPlan.status === 'ACTIVE' && (
                <Button className="w-full" variant="outline">
                  Mark Completed
                </Button>
              )}
              <Button className="w-full" variant="outline" disabled>
                Export Plan
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function PlanPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PlanView />
    </Suspense>
  )
}
