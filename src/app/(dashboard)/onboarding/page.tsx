"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  GraduationCap, 
  Users, 
  Clock, 
  CheckCircle,
  Circle,
  Play,
  Pause,
  MoreHorizontal,
  Calendar,
  Target
} from "lucide-react"

export default function OnboardingPage() {
  const [activeTab, setActiveTab] = useState("plans")

  // Mock data
  const onboardingPlans = [
    {
      id: "1",
      title: "Software Engineer - 30 Day Plan",
      employee: "John Doe",
      status: "active",
      progress: 65,
      startDate: "2024-01-15",
      endDate: "2024-02-14",
      tasks: [
        { id: "1", title: "Complete HR paperwork", status: "completed" },
        { id: "2", title: "Set up development environment", status: "completed" },
        { id: "3", title: "Review codebase architecture", status: "in_progress" },
        { id: "4", title: "Complete first code review", status: "pending" },
        { id: "5", title: "Meet with team members", status: "pending" }
      ]
    },
    {
      id: "2",
      title: "Marketing Manager - 60 Day Plan",
      employee: "Jane Smith",
      status: "completed",
      progress: 100,
      startDate: "2023-12-01",
      endDate: "2024-01-30",
      tasks: [
        { id: "1", title: "Complete HR paperwork", status: "completed" },
        { id: "2", title: "Review marketing strategy", status: "completed" },
        { id: "3", title: "Meet with stakeholders", status: "completed" },
        { id: "4", title: "Create first campaign", status: "completed" }
      ]
    },
    {
      id: "3",
      title: "Sales Representative - 90 Day Plan",
      employee: "Mike Johnson",
      status: "paused",
      progress: 30,
      startDate: "2024-01-10",
      endDate: "2024-04-10",
      tasks: [
        { id: "1", title: "Complete HR paperwork", status: "completed" },
        { id: "2", title: "Product training", status: "in_progress" },
        { id: "3", title: "Shadow senior sales rep", status: "pending" },
        { id: "4", title: "First client meeting", status: "pending" }
      ]
    }
  ]

  const templates = [
    {
      id: "1",
      name: "Software Engineer",
      duration: 30,
      description: "Comprehensive onboarding for new software engineers",
      tasks: 12,
      isActive: true
    },
    {
      id: "2",
      name: "Marketing Manager",
      duration: 60,
      description: "Marketing role onboarding with campaign focus",
      tasks: 15,
      isActive: true
    },
    {
      id: "3",
      name: "Sales Representative",
      duration: 90,
      description: "Sales role onboarding with client interaction focus",
      tasks: 20,
      isActive: true
    },
    {
      id: "4",
      name: "HR Specialist",
      duration: 45,
      description: "Human resources specialist onboarding",
      tasks: 18,
      isActive: false
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-blue-500"
      case "completed": return "bg-green-500"
      case "paused": return "bg-yellow-500"
      default: return "bg-gray-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <Play className="h-4 w-4" />
      case "completed": return <CheckCircle className="h-4 w-4" />
      case "paused": return <Pause className="h-4 w-4" />
      default: return <Circle className="h-4 w-4" />
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span>Clario Onboarding</span>
          </h1>
          <p className="text-muted-foreground">
            AI-powered onboarding plans and progress tracking
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Plan
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === "plans" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("plans")}
        >
          Active Plans
        </Button>
        <Button
          variant={activeTab === "templates" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("templates")}
        >
          Templates
        </Button>
        <Button
          variant={activeTab === "analytics" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("analytics")}
        >
          Analytics
        </Button>
      </div>

      {/* Active Plans Tab */}
      {activeTab === "plans" && (
        <div className="space-y-4">
          {onboardingPlans.map((plan) => (
            <Card key={plan.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center space-x-2">
                      <div className={`h-3 w-3 rounded-full ${getStatusColor(plan.status)}`}></div>
                      <span>{plan.title}</span>
                      <Badge variant={plan.status === "active" ? "default" : "secondary"}>
                        {plan.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Employee: {plan.employee} • Started: {plan.startDate}
                    </CardDescription>
                    <div className="flex items-center space-x-4 mt-3">
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Target className="h-4 w-4" />
                        <span>{plan.progress}% complete</span>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Ends: {plan.endDate}</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{plan.progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${plan.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Tasks</h4>
                  {plan.tasks.map((task) => (
                    <div key={task.id} className="flex items-center space-x-2 text-sm">
                      {task.status === "completed" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : task.status === "in_progress" ? (
                        <Circle className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={task.status === "completed" ? "line-through text-muted-foreground" : ""}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center space-x-2">
                      <span>{template.name}</span>
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? "Active" : "Draft"}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {template.description}
                    </CardDescription>
                    <div className="flex items-center space-x-4 mt-3 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{template.duration} days</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="h-4 w-4" />
                        <span>{template.tasks} tasks</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Edit
                  </Button>
                  <Button size="sm" className="flex-1">
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Completion Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">28 days</div>
              <p className="text-xs text-muted-foreground">
                -3 days from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94%</div>
              <p className="text-xs text-muted-foreground">
                +2% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                +3 from last month
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
