"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Plus,
  Calendar,
  Clock,
  Users,
  Target,
  TrendingUp,
  CheckCircle,
  Zap,
  Lightbulb,
  FileText,
  BarChart3,
  Bell,
  Video,
  Phone,
  Calendar as CalendarIcon,
  FileText as DocumentText,
  Activity,
  Grid,
  Search,
  Filter,
  Circle,
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import { useTheme } from "@/components/theme-provider"

// Mock data for demo
const mockMeetings = [
  {
    id: "1",
    title: "Sprint Planning",
    time: "9:00 AM",
    attendees: 3,
    priority: "HIGH",
    type: "video"
  },
  {
    id: "2", 
    title: "Client Review",
    time: "2:00 PM",
    attendees: 2,
    priority: "HIGH",
    type: "video"
  },
  {
    id: "3",
    title: "1:1 with Manager",
    time: "4:30 PM", 
    attendees: 1,
    priority: "MEDIUM",
    type: "phone"
  }
]

const mockTasks = [
  {
    id: "1",
    title: "Review Q4 roadmap",
    priority: "HIGH",
    dueDate: "Today",
    completed: false
  },
  {
    id: "2",
    title: "Update user documentation",
    priority: "MEDIUM", 
    dueDate: "Tomorrow",
    completed: false
  },
  {
    id: "3",
    title: "Code review for auth module",
    priority: "HIGH",
    dueDate: "Friday",
    completed: false
  }
]

const mockProjects = [
  {
    id: "1",
    name: "Product Strategy",
    status: "active",
    progress: 75,
    tasks: 8
  },
  {
    id: "2", 
    name: "Authentication",
    status: "active",
    progress: 45,
    tasks: 12
  },
  {
    id: "3",
    name: "Documentation", 
    status: "on-hold",
    progress: 30,
    tasks: 5
  }
]

export default function DashboardMinimalPage() {
  const { themeConfig } = useTheme()
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return "Good morning!"
    if (hour < 17) return "Good afternoon!"
    return "Good evening!"
  }

  const completedTasks = mockTasks.filter(task => task.completed).length
  const totalTasks = mockTasks.length

  return (
    <div className="min-h-screen" style={{ backgroundColor: themeConfig.background }}>
      {/* Minimal Header */}
      <div className="border-b" style={{ backgroundColor: themeConfig.card, borderColor: themeConfig.border }}>
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-light" style={{ color: themeConfig.foreground }}>Lumi</h1>
              <div className="flex items-center space-x-6">
                <Link href="/" className="text-sm font-medium" style={{ color: themeConfig.foreground }}>Dashboard</Link>
                <Link href="/projects" className="text-sm" style={{ color: themeConfig.mutedForeground }}>Projects</Link>
                <Link href="/wiki" className="text-sm" style={{ color: themeConfig.mutedForeground }}>Wiki</Link>
                <Link href="/ask" className="text-sm" style={{ color: themeConfig.mutedForeground }}>Ask AI</Link>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Zap className="h-4 w-4 mr-2" />
                Ask AI
              </Button>
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                A
              </div>
            </div>
          </div>

          {/* Dashboard Layout Selector */}
          <div className="flex items-center justify-center mt-6 pt-6 border-t" style={{ borderColor: themeConfig.border }}>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium" style={{ color: themeConfig.foreground }}>Layout:</span>
              <div className="flex items-center space-x-1">
                <Link href="/dashboard-grid">
                  <Button variant="outline" size="sm" className="h-8">
                    <Grid className="h-4 w-4 mr-1" />
                    Grid
                  </Button>
                </Link>
                <Link href="/dashboard-compact">
                  <Button variant="outline" size="sm" className="h-8">
                    Compact
                  </Button>
                </Link>
                <Link href="/dashboard-minimal">
                  <Button variant="default" size="sm" className="h-8">
                    Minimal
                  </Button>
                </Link>
                <Link href="/dashboard-sidebar">
                  <Button variant="outline" size="sm" className="h-8">
                    Sidebar
                  </Button>
                </Link>
                <Link href="/dashboard-original">
                  <Button variant="outline" size="sm" className="h-8">
                    Original
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Minimal Welcome */}
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-light mb-4" style={{ color: themeConfig.foreground }}>
            {getGreeting()} 👋
          </h2>
          <p className="text-lg" style={{ color: themeConfig.mutedForeground }}>
            {formatDate(currentTime)}
          </p>
        </div>

        {/* Minimal Dashboard - Ultra Clean */}
        <div className="space-y-12">
          {/* Focus Section */}
          <div className="text-center">
            <h3 className="text-2xl font-light mb-8" style={{ color: themeConfig.foreground }}>
              Today's Focus
            </h3>
            
            <div className="grid grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
                <div className="text-3xl font-light mb-2" style={{ color: themeConfig.foreground }}>
                  {totalTasks}
                </div>
                <div className="text-sm" style={{ color: themeConfig.mutedForeground }}>
                  Tasks Today
                </div>
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="text-3xl font-light mb-2" style={{ color: themeConfig.foreground }}>
                  {completedTasks}
                </div>
                <div className="text-sm" style={{ color: themeConfig.mutedForeground }}>
                  Completed
                </div>
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-50 flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-purple-600" />
                </div>
                <div className="text-3xl font-light mb-2" style={{ color: themeConfig.foreground }}>
                  {mockMeetings.length}
                </div>
                <div className="text-sm" style={{ color: themeConfig.mutedForeground }}>
                  Meetings
                </div>
              </div>
            </div>
          </div>

          {/* Tasks Section */}
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl font-light mb-6 text-center" style={{ color: themeConfig.foreground }}>
              Today's Tasks
            </h3>
            
            <div className="space-y-3">
              {mockTasks.map((task) => (
                <div key={task.id} className="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`w-5 h-5 rounded-full border-2 ${
                    task.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'
                  } flex items-center justify-center`}>
                    {task.completed && <CheckCircle className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-medium" style={{ color: themeConfig.foreground }}>
                      {task.title}
                    </p>
                    <div className="flex items-center space-x-3 text-sm" style={{ color: themeConfig.mutedForeground }}>
                      <Badge 
                        variant={task.priority === 'HIGH' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {task.priority}
                      </Badge>
                      <span>{task.dueDate}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </div>
              ))}
            </div>
          </div>

          {/* Projects Section */}
          <div className="max-w-3xl mx-auto">
            <h3 className="text-xl font-light mb-6 text-center" style={{ color: themeConfig.foreground }}>
              Active Projects
            </h3>
            
            <div className="space-y-6">
              {mockProjects.map((project) => (
                <div key={project.id} className="text-center">
                  <div className="flex items-center justify-center space-x-4 mb-4">
                    <div className={`w-3 h-3 rounded-full ${
                      project.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                    }`} />
                    <h4 className="text-lg font-medium" style={{ color: themeConfig.foreground }}>
                      {project.name}
                    </h4>
                    <Badge 
                      variant={project.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {project.status}
                    </Badge>
                  </div>
                  
                  <div className="max-w-md mx-auto">
                    <div className="flex items-center justify-between text-sm mb-2" style={{ color: themeConfig.mutedForeground }}>
                      <span>{project.progress}% complete</span>
                      <span>{project.tasks} tasks</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Meetings Section */}
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl font-light mb-6 text-center" style={{ color: themeConfig.foreground }}>
              Today's Meetings
            </h3>
            
            <div className="space-y-4">
              {mockMeetings.map((meeting) => (
                <div key={meeting.id} className="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0">
                    {meeting.type === 'video' ? (
                      <Video className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Phone className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-medium" style={{ color: themeConfig.foreground }}>
                      {meeting.title}
                    </p>
                    <div className="flex items-center space-x-3 text-sm" style={{ color: themeConfig.mutedForeground }}>
                      <span>{meeting.time}</span>
                      <span>•</span>
                      <span>{meeting.attendees} people</span>
                    </div>
                  </div>
                  <Badge 
                    variant={meeting.priority === 'HIGH' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {meeting.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* AI Suggestion - Minimal */}
          <div className="max-w-2xl mx-auto text-center">
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-medium text-lg mb-3" style={{ color: themeConfig.foreground }}>
                  AI Suggestion
                </h4>
                <p className="text-sm mb-6" style={{ color: themeConfig.mutedForeground }}>
                  Focus on "Review Q4 roadmap" first - it's blocking other strategic decisions.
                </p>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Zap className="h-4 w-4 mr-2" />
                  Get AI Help
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions - Minimal */}
          <div className="max-w-md mx-auto text-center">
            <h3 className="text-lg font-light mb-6" style={{ color: themeConfig.foreground }}>
              Quick Actions
            </h3>
            <div className="flex items-center justify-center space-x-4">
              <Button variant="outline" size="lg">
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
              <Button variant="outline" size="lg">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Schedule
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
