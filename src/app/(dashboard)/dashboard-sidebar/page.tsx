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
  Home,
  BookOpen,
  Bot,
  Settings,
  Building2,
  Eye,
  Edit,
  Trash2,
  Menu,
  X
} from "lucide-react"
import Link from "next/link"
import { useTheme } from "@/components/theme-provider"

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

export default function DashboardSidebarPage() {
  const { themeConfig } = useTheme()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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

  const sidebarItems = [
    { icon: Home, label: "Dashboard", href: "/", active: true },
    { icon: Building2, label: "Projects", href: "/projects" },
    { icon: BookOpen, label: "Wiki", href: "/wiki" },
    { icon: Bot, label: "Ask AI", href: "/ask" },
    { icon: Users, label: "Onboarding", href: "/onboarding" },
    { icon: Activity, label: "Org", href: "/org" },
    { icon: Settings, label: "Settings", href: "/settings" }
  ]

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: themeConfig.background }}>
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 border-r`} 
           style={{ backgroundColor: themeConfig.card, borderColor: themeConfig.border }}>
        <div className="p-4">
          {/* Logo */}
          <div className="flex items-center justify-between mb-8">
            {!sidebarCollapsed && (
              <h1 className="text-lg font-semibold" style={{ color: themeConfig.foreground }}>Loopwell</h1>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1"
            >
              {sidebarCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {sidebarItems.map((item) => (
              <Link key={item.label} href={item.href}>
                <div className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  item.active ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}>
                  <item.icon className="h-4 w-4" style={{ color: item.active ? '#3b82f6' : themeConfig.mutedForeground }} />
                  {!sidebarCollapsed && (
                    <span className={`text-sm ${item.active ? 'text-blue-600 font-medium' : ''}`} 
                          style={{ color: item.active ? '#3b82f6' : themeConfig.foreground }}>
                      {item.label}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </nav>

          {/* User Info */}
          {!sidebarCollapsed && (
            <div className="mt-8 pt-4 border-t" style={{ borderColor: themeConfig.border }}>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                  A
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: themeConfig.foreground }}>Antoine</p>
                  <p className="text-xs" style={{ color: themeConfig.mutedForeground }}>Personal Space</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="border-b px-6 py-4" style={{ backgroundColor: themeConfig.card, borderColor: themeConfig.border }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-1" style={{ color: themeConfig.foreground }}>
                {getGreeting()} 👋
              </h2>
              <p className="text-sm" style={{ color: themeConfig.mutedForeground }}>
                {formatDate(currentTime)}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Zap className="h-4 w-4 mr-2" />
                Ask AI
              </Button>
            </div>
          </div>

          {/* Dashboard Layout Selector */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: themeConfig.border }}>
            <div className="flex items-center space-x-4">
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
                  <Button variant="outline" size="sm" className="h-8">
                    Minimal
                  </Button>
                </Link>
                <Link href="/dashboard-sidebar">
                  <Button variant="default" size="sm" className="h-8">
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
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="h-8">
                <Search className="h-4 w-4 mr-1" />
                Search
              </Button>
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="h-4 w-4 mr-1" />
                Filter
              </Button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: themeConfig.mutedForeground }}>Tasks Today</p>
                    <p className="text-2xl font-semibold" style={{ color: themeConfig.foreground }}>{totalTasks}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: themeConfig.mutedForeground }}>Completed</p>
                    <p className="text-2xl font-semibold" style={{ color: themeConfig.foreground }}>{completedTasks}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Target className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: themeConfig.mutedForeground }}>Meetings</p>
                    <p className="text-2xl font-semibold" style={{ color: themeConfig.foreground }}>{mockMeetings.length}</p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: themeConfig.mutedForeground }}>Productivity</p>
                    <p className="text-2xl font-semibold" style={{ color: themeConfig.foreground }}>85%</p>
                  </div>
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Today's Tasks */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Today's Tasks</span>
                      <Badge variant="outline" className="text-xs">{mockTasks.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {mockTasks.map((task) => (
                      <div key={task.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          task.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'
                        } flex items-center justify-center`}>
                          {task.completed && <CheckCircle className="h-3 w-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: themeConfig.foreground }}>
                            {task.title}
                          </p>
                          <div className="flex items-center space-x-2 text-xs" style={{ color: themeConfig.mutedForeground }}>
                            <Badge 
                              variant={task.priority === 'HIGH' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {task.priority}
                            </Badge>
                            <span>{task.category}</span>
                            <span>•</span>
                            <span>{task.dueDate}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Today's Meetings */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Today's Meetings</span>
                      <Badge variant="outline" className="text-xs">{mockMeetings.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {mockMeetings.map((meeting) => (
                      <div key={meeting.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-shrink-0">
                          {meeting.type === 'video' ? (
                            <Video className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Phone className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: themeConfig.foreground }}>
                            {meeting.title}
                          </p>
                          <div className="flex items-center space-x-2 text-xs" style={{ color: themeConfig.mutedForeground }}>
                            <span>{meeting.time}</span>
                            <span>•</span>
                            <span>{meeting.attendees} people</span>
                            <span>•</span>
                            <span>{meeting.team}</span>
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
                  </CardContent>
                </Card>
              </div>

              {/* Middle Column */}
              <div className="space-y-6">
                {/* Active Projects */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Active Projects</span>
                      <Badge variant="outline" className="text-xs">{mockProjects.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {mockProjects.map((project) => (
                      <div key={project.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              project.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                            }`} />
                            <h4 className="text-sm font-medium" style={{ color: themeConfig.foreground }}>
                              {project.name}
                            </h4>
                          </div>
                          <Badge 
                            variant={project.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {project.status}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs" style={{ color: themeConfig.mutedForeground }}>
                            <span>{project.progress}% complete</span>
                            <span>{project.tasks} tasks</span>
                          </div>
                          <Progress value={project.progress} className="h-2" />
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
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" size="sm" className="h-10">
                        <Plus className="h-4 w-4 mr-2" />
                        New Task
                      </Button>
                      <Button variant="outline" size="sm" className="h-10">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Schedule
                      </Button>
                      <Button variant="outline" size="sm" className="h-10">
                        <DocumentText className="h-4 w-4 mr-2" />
                        New Page
                      </Button>
                      <Button variant="outline" size="sm" className="h-10">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Analytics */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Analytics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {mockAnalytics.map((metric, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium" style={{ color: themeConfig.foreground }}>
                            {metric.label}
                          </span>
                          <span className="text-sm font-semibold" style={{ color: themeConfig.foreground }}>
                            {metric.value}{metric.unit || '%'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${metric.color}`}
                            style={{ width: `${metric.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* This Week Calendar */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">This Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                        <div key={day} className="text-center">
                          <div className="text-xs font-medium mb-2" style={{ color: themeConfig.mutedForeground }}>
                            {day}
                          </div>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
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
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Weekly Goal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="relative w-20 h-20 mx-auto mb-4">
                        <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
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
                          <span className="text-lg font-semibold" style={{ color: themeConfig.foreground }}>75%</span>
                        </div>
                      </div>
                      <p className="text-sm font-medium" style={{ color: themeConfig.foreground }}>On track</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* AI Suggestions */}
            <div className="mt-8">
              <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <Lightbulb className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium mb-2" style={{ color: themeConfig.foreground }}>
                        AI Suggestion: Focus on High-Priority Tasks
                      </h4>
                      <p className="text-sm mb-3" style={{ color: themeConfig.mutedForeground }}>
                        Based on your current workload, consider tackling the "Review Q4 roadmap" task first, as it's blocking other strategic decisions.
                      </p>
                      <div className="flex space-x-2">
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                          <Zap className="h-4 w-4 mr-2" />
                          Get AI Help
                        </Button>
                        <Button size="sm" variant="outline">
                          Learn more
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
