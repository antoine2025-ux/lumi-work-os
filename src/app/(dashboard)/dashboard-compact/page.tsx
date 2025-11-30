"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  AlertCircle,
  Zap,
  Lightbulb,
  FileText,
  BarChart3,
  Bell,
  ChevronRight,
  Play,
  Pause,
  MoreHorizontal,
  Video,
  Phone,
  User,
  Calendar as CalendarIcon,
  FileText as DocumentText,
  Activity,
  Grid,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2
} from "lucide-react"
import Link from "next/link"
import { useTheme } from "@/components/theme-provider"
import { LoopbrainAssistantLauncher } from "@/components/loopbrain/assistant-launcher"

// Mock data for demo
const mockMeetings = [
  {
    id: "1",
    title: "Sprint Planning",
    time: "9:00 AM",
    duration: "1h",
    attendees: 3,
    team: "Engineering Team",
    priority: "HIGH",
    type: "video"
  },
  {
    id: "2", 
    title: "Client Review",
    time: "2:00 PM",
    duration: "45m",
    attendees: 2,
    team: "Client Relations",
    priority: "HIGH",
    type: "video"
  },
  {
    id: "3",
    title: "1:1 with Manager",
    time: "4:30 PM", 
    duration: "30m",
    attendees: 1,
    team: "Direct Report",
    priority: "MEDIUM",
    type: "phone"
  }
]

const mockTasks = [
  {
    id: "1",
    title: "Review Q4 roadmap",
    priority: "HIGH",
    category: "Product Strategy",
    dueDate: "Today",
    completed: false
  },
  {
    id: "2",
    title: "Update user documentation",
    priority: "MEDIUM", 
    category: "Documentation",
    dueDate: "Tomorrow",
    completed: false
  },
  {
    id: "3",
    title: "Code review for auth module",
    priority: "HIGH",
    category: "Authentication", 
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
    tasks: 8,
    dueDate: "Jan 15"
  },
  {
    id: "2", 
    name: "Authentication",
    status: "active",
    progress: 45,
    tasks: 12,
    dueDate: "Jan 20"
  },
  {
    id: "3",
    name: "Documentation", 
    status: "on-hold",
    progress: 30,
    tasks: 5,
    dueDate: "Feb 1"
  }
]

const mockAnalytics = [
  { label: "Productivity", value: 85, color: "bg-green-500" },
  { label: "Focus Time", value: 6.5, color: "bg-blue-500", unit: "h" },
  { label: "Team Collaboration", value: 92, color: "bg-purple-500" }
]

export default function DashboardCompactPage() {
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
      {/* Compact Header */}
      <div className="border-b" style={{ backgroundColor: themeConfig.card, borderColor: themeConfig.border }}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-semibold" style={{ color: themeConfig.foreground }}>Loopwell</h1>
              <div className="flex items-center space-x-3">
                <span className="text-sm" style={{ color: themeConfig.mutedForeground }}>Personal Space</span>
                <Badge variant="outline" className="text-xs">OWNER</Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                A
              </div>
            </div>
          </div>
          
          {/* Compact Navigation */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-5">
              <Link href="/home" className="text-sm font-medium" style={{ color: themeConfig.foreground }}>Dashboard</Link>
              <Link href="/projects" className="text-sm" style={{ color: themeConfig.mutedForeground }}>Projects</Link>
              <Link href="/wiki" className="text-sm" style={{ color: themeConfig.mutedForeground }}>Wiki</Link>
              <Link href="/ask" className="text-sm" style={{ color: themeConfig.mutedForeground }}>LoopBrain</Link>
              <Link href="/onboarding" className="text-sm" style={{ color: themeConfig.mutedForeground }}>Onboarding</Link>
              <Link href="/org" className="text-sm" style={{ color: themeConfig.mutedForeground }}>Org</Link>
              <Link href="/settings" className="text-sm" style={{ color: themeConfig.mutedForeground }}>Settings</Link>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="h-8">
                <Plus className="h-3 w-3 mr-1" />
                New Task
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8">
                <Zap className="h-3 w-3 mr-1" />
                LoopBrain
              </Button>
            </div>
          </div>

          {/* Dashboard Layout Selector */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: themeConfig.border }}>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium" style={{ color: themeConfig.foreground }}>Layout:</span>
              <div className="flex items-center space-x-1">
                <Link href="/dashboard-grid">
                  <Button variant="outline" size="sm" className="h-7">
                    <Grid className="h-3 w-3 mr-1" />
                    Grid
                  </Button>
                </Link>
                <Link href="/dashboard-compact">
                  <Button variant="default" size="sm" className="h-7">
                    Compact
                  </Button>
                </Link>
                <Link href="/dashboard-minimal">
                  <Button variant="outline" size="sm" className="h-7">
                    Minimal
                  </Button>
                </Link>
                <Link href="/dashboard-sidebar">
                  <Button variant="outline" size="sm" className="h-7">
                    Sidebar
                  </Button>
                </Link>
                <Link href="/dashboard-original">
                  <Button variant="outline" size="sm" className="h-7">
                    Original
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <Button variant="outline" size="sm" className="h-7">
                <Search className="h-3 w-3 mr-1" />
                Search
              </Button>
              <Button variant="outline" size="sm" className="h-7">
                <Filter className="h-3 w-3 mr-1" />
                Filter
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Compact Welcome */}
        <div className="mb-6">
          <h2 className="text-2xl font-light mb-1" style={{ color: themeConfig.foreground }}>
            {getGreeting()} 👋
          </h2>
          <p className="text-sm" style={{ color: themeConfig.mutedForeground }}>
            {formatDate(currentTime)}
          </p>
        </div>

        {/* Compact Dashboard - Dense Layout */}
        <div className="space-y-4">
          {/* Top Row - Key Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: themeConfig.mutedForeground }}>Tasks Today</p>
                  <p className="text-lg font-semibold" style={{ color: themeConfig.foreground }}>{totalTasks}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: themeConfig.mutedForeground }}>Completed</p>
                  <p className="text-lg font-semibold" style={{ color: themeConfig.foreground }}>{completedTasks}</p>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Target className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: themeConfig.mutedForeground }}>Meetings</p>
                  <p className="text-lg font-semibold" style={{ color: themeConfig.foreground }}>{mockMeetings.length}</p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: themeConfig.mutedForeground }}>Productivity</p>
                  <p className="text-lg font-semibold" style={{ color: themeConfig.foreground }}>85%</p>
                </div>
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content Row */}
          <div className="grid grid-cols-3 gap-4">
            {/* Left Column - Tasks & Meetings */}
            <div className="space-y-4">
              {/* Today's Tasks */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Today's Tasks</span>
                    <Badge variant="outline" className="text-xs">{mockTasks.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {mockTasks.map((task) => (
                    <div key={task.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted transition-colors">
                      <div className={`w-3 h-3 rounded-full border ${
                        task.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: themeConfig.foreground }}>
                          {task.title}
                        </p>
                        <div className="flex items-center space-x-1 text-xs" style={{ color: themeConfig.mutedForeground }}>
                          <Badge 
                            variant={task.priority === 'HIGH' ? 'destructive' : 'secondary'}
                            className="text-xs px-1 py-0"
                          >
                            {task.priority}
                          </Badge>
                          <span>{task.dueDate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Today's Meetings */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Today's Meetings</span>
                    <Badge variant="outline" className="text-xs">{mockMeetings.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {mockMeetings.map((meeting) => (
                    <div key={meeting.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted transition-colors">
                      <div className="flex-shrink-0">
                        {meeting.type === 'video' ? (
                          <Video className="h-3 w-3 text-blue-600" />
                        ) : (
                          <Phone className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: themeConfig.foreground }}>
                          {meeting.title}
                        </p>
                        <div className="flex items-center space-x-1 text-xs" style={{ color: themeConfig.mutedForeground }}>
                          <span>{meeting.time}</span>
                          <span>•</span>
                          <span>{meeting.attendees}p</span>
                        </div>
                      </div>
                      <Badge 
                        variant={meeting.priority === 'HIGH' ? 'destructive' : 'secondary'}
                        className="text-xs px-1 py-0"
                      >
                        {meeting.priority}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Middle Column - Projects */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Active Projects</span>
                    <Badge variant="outline" className="text-xs">{mockProjects.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockProjects.map((project) => (
                    <div key={project.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            project.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                          }`} />
                          <span className="text-sm font-medium" style={{ color: themeConfig.foreground }}>
                            {project.name}
                          </span>
                        </div>
                        <Badge 
                          variant={project.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs px-1 py-0"
                        >
                          {project.status}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs" style={{ color: themeConfig.mutedForeground }}>
                          <span>{project.progress}%</span>
                          <span>{project.tasks}t</span>
                        </div>
                        <Progress value={project.progress} className="h-1" />
                        <div className="text-xs" style={{ color: themeConfig.mutedForeground }}>
                          Due: {project.dueDate}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      Task
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      Schedule
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <DocumentText className="h-3 w-3 mr-1" />
                      Page
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Analytics & Calendar */}
            <div className="space-y-4">
              {/* Analytics */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Analytics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockAnalytics.map((metric, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium" style={{ color: themeConfig.foreground }}>
                          {metric.label}
                        </span>
                        <span className="text-xs font-semibold" style={{ color: themeConfig.foreground }}>
                          {metric.value}{metric.unit || '%'}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${metric.color}`}
                          style={{ width: `${metric.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* This Week Calendar */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">This Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-1">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                      <div key={day} className="text-center">
                        <div className="text-xs font-medium mb-1" style={{ color: themeConfig.mutedForeground }}>
                          {day}
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          index === 0 ? 'bg-blue-100 text-blue-600' : ''
                        }`}>
                          {index + 1}
                        </div>
                        {index === 0 && <div className="w-1 h-1 bg-blue-500 rounded-full mx-auto mt-1" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Goal */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Weekly Goal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-2">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-gray-200"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-green-500"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          strokeDasharray="75, 100"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-semibold" style={{ color: themeConfig.foreground }}>75%</span>
                      </div>
                    </div>
                    <p className="text-xs font-medium" style={{ color: themeConfig.foreground }}>On track</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* AI Suggestions - Compact */}
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Lightbulb className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1" style={{ color: themeConfig.foreground }}>
                    AI Suggestion: Focus on High-Priority Tasks
                  </h4>
                  <p className="text-xs mb-2" style={{ color: themeConfig.mutedForeground }}>
                    Consider tackling "Review Q4 roadmap" first, as it's blocking other strategic decisions.
                  </p>
                  <div className="flex space-x-2">
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700 h-7 text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Get AI Help
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      Learn more
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Global Loopbrain Assistant */}
      <LoopbrainAssistantLauncher mode="dashboard" />
    </div>
  )
}
