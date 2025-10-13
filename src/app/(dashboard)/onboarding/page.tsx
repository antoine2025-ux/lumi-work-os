'use client'

import { Suspense, useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/onboarding/progress-bar'
import { PlanCard } from '@/components/onboarding/plan-card'
import { TemplateCard } from '@/components/onboarding/template-card'
import { NewPlanDialog } from '@/components/onboarding/new-plan-dialog'
import { Button } from '@/components/ui/button'
import { Plus, TrendingUp, Users, Calendar, CheckCircle2 } from 'lucide-react'

// Mock employees for now - in a real app, this would come from API
const mockEmployees = [
  { id: '1', name: 'John Doe', email: 'john.doe@company.com' },
  { id: '2', name: 'Jane Smith', email: 'jane.smith@company.com' },
]

function ActivePlansTab() {
  const [plans, setPlans] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/onboarding/plans')
      if (response.ok) {
        const data = await response.json()
        setPlans(data.plans || [])
      }
    } catch (error) {
      console.error('Error fetching plans:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/onboarding/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  useEffect(() => {
    fetchPlans()
    fetchTemplates()
  }, [])

  const handleCreateFromTemplate = async (data: any) => {
    setLoading(true)
    try {
      const response = await fetch('/api/onboarding/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (response.ok) {
        await fetchPlans() // Refresh the list
        alert('✅ Plan created successfully!')
      } else {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to create plan')
      }
    } catch (error) {
      console.error('Error creating plan:', error)
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Failed to create plan'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateWithAI = async (data: any) => {
    setLoading(true)
    try {
      const response = await fetch('/api/onboarding/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      const result = await response.json()
      
      if (response.ok) {
        await fetchPlans() // Refresh the list
        alert(`✅ ${result.message || 'AI-generated plan created successfully!'}`)
      } else {
        throw new Error(result.error?.message || 'Failed to generate plan')
      }
    } catch (error) {
      console.error('Error creating plan with AI:', error)
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Failed to generate plan'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Active Plans</h2>
          <p className="text-muted-foreground">Track ongoing onboarding progress</p>
        </div>
        <NewPlanDialog
          employees={mockEmployees}
          templates={templates}
          onCreateFromTemplate={handleCreateFromTemplate}
          onCreateWithAI={handleCreateWithAI}
        />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onEdit={(planId) => console.log('Edit plan:', planId)}
            onMarkCompleted={(planId) => console.log('Mark completed:', planId)}
            onDelete={(planId) => console.log('Delete plan:', planId)}
          />
        ))}
      </div>
    </div>
  )
}

function TemplatesTab() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/onboarding/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Templates</h2>
          <p className="text-muted-foreground">Manage onboarding templates</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onEdit={(templateId) => console.log('Edit template:', templateId)}
            onDuplicate={(templateId) => console.log('Duplicate template:', templateId)}
            onDelete={(templateId) => console.log('Delete template:', templateId)}
          />
        ))}
      </div>
    </div>
  )
}

function AnalyticsTab() {
  const [analytics, setAnalytics] = useState<any>(null)

  const fetchAnalytics = async () => {
    try {
      // For now, we'll calculate analytics from the plans data
      const response = await fetch('/api/onboarding/plans')
      if (response.ok) {
        const data = await response.json()
        const plans = data.plans || []
        
        const activePlans = plans.filter((plan: any) => plan.status === 'ACTIVE')
        const completedPlans = plans.filter((plan: any) => plan.status === 'COMPLETED')
        
        const avgCompletionRate = completedPlans.length > 0 
          ? completedPlans.reduce((sum: number, plan: any) => sum + plan.progressPct, 0) / completedPlans.length 
          : 0

        const overdueTasks = plans.flatMap((plan: any) => 
          plan.tasks.filter((task: any) => 
            task.status !== 'DONE' && 
            task.dueDate && 
            new Date(task.dueDate) < new Date()
          )
        )

        setAnalytics({
          totalPlans: plans.length,
          activePlans: activePlans.length,
          completedPlans: completedPlans.length,
          avgCompletionRate: Math.round(avgCompletionRate),
          overdueTasks: overdueTasks.length,
          plans: plans.map((plan: any) => ({
            id: plan.id,
            name: plan.name,
            employeeName: plan.employee?.name || plan.employee?.email,
            status: plan.status,
            progressPct: plan.progressPct,
            tasksDone: plan.tasks.filter((task: any) => task.status === 'DONE').length,
            totalTasks: plan.tasks.length,
            daysSinceStart: Math.ceil((new Date().getTime() - new Date(plan.startDate).getTime()) / (1000 * 60 * 60 * 24)),
          })),
        })
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  if (!analytics) {
    return <div>Loading analytics...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Analytics</h2>
        <p className="text-muted-foreground">Track onboarding performance and completion rates</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.activePlans}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalPlans} total plans
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Across all plans
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Overdue</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overdueTasks}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Plans</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.completedPlans}</div>
            <p className="text-xs text-muted-foreground">
              Successfully finished
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Plan Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.plans.map((plan: any) => (
              <div key={plan.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-sm text-muted-foreground">{plan.employeeName}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={plan.status === 'COMPLETED' ? 'default' : 'secondary'}>
                      {plan.status}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      {plan.tasksDone}/{plan.totalTasks} tasks
                    </p>
                  </div>
                </div>
                <ProgressBar value={plan.progressPct} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Onboarding</h1>
        <p className="text-muted-foreground">
          Manage employee onboarding plans and track progress
        </p>
      </div>
      
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Plans</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active">
          <Suspense fallback={<div>Loading...</div>}>
            <ActivePlansTab />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="templates">
          <Suspense fallback={<div>Loading...</div>}>
            <TemplatesTab />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="analytics">
          <Suspense fallback={<div>Loading...</div>}>
            <AnalyticsTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}