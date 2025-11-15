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
  X,
  List
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

export default function DashboardOriginalPage() {
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
      {/* Original Header */}
      <div className="border-b" style={{ backgroundColor: themeConfig.card, borderColor: themeConfig.border }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <h1 className="text-xl font-semibold" style={{ color: themeConfig.foreground }}>Loopwell</h1>
              <div className="flex items-center space-x-4">
                <span className="text-sm" style={{ color: themeConfig.mutedForeground }}>Personal Space</span>
                <Badge variant="outline" className="text-xs">OWNER</Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                A
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-6">
              <Link href="/home" className="text-sm font-medium" style={{ color: themeConfig.foreground }}>Dashboard</Link>
              <Link href="/projects" className="text-sm" style={{ color: themeConfig.mutedForeground }}>Projects</Link>
              <Link href="/wiki" className="text-sm" style={{ color: themeConfig.mutedForeground }}>Wiki</Link>
                <Link href="/ask" className="text-sm" style={{ color: themeConfig.mutedForeground }}>LoopBrain</Link>
              <Link href="/onboarding" className="text-sm" style={{ color: themeConfig.mutedForeground }}>Onboarding</Link>
              <Link href="/org" className="text-sm" style={{ color: themeConfig.mutedForeground }}>Org</Link>
              <Link href="/settings" className="text-sm" style={{ color: themeConfig.mutedForeground }}>Settings</Link>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Zap className="h-4 w-4 mr-2" />
                LoopBrain
              </Button>
            </div>
          </div>

          {/* Layout Selector */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: themeConfig.border }}>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium" style={{ color: themeConfig.foreground }}>Dashboard Layout:</span>
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
                  <Button variant="outline" size="sm" className="h-8">
                    Sidebar
                  </Button>
                </Link>
                <Link href="/dashboard-original">
                  <Button variant="default" size="sm" className="h-8">
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
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-semibold mb-2" style={{ color: themeConfig.foreground }}>
            {getGreeting()} 👋
          </h2>
          <p className="text-lg" style={{ color: themeConfig.mutedForeground }}>
            {formatDate(currentTime)}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4" style={{ color: themeConfig.foreground }}>Quick Actions</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-16 flex-col space-y-2">
              <Plus className="h-5 w-5" />
              <span>New Task</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-2">
              <CalendarIcon className="h-5 w-5" />
              <span>Schedule</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-2">
              <DocumentText className="h-5 w-5" />
              <span>New Page</span>
            </Button>
            <Button variant="outline" className="h-16 flex-col space-y-2">
              <BarChart3 className="h-5 w-5" />
              <span>Analytics</span>
            </Button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Today's Meetings */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Today's Meetings</span>
                  <Badge variant="outline" className="text-xs">{mockMeetings.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockMeetings.map((meeting) => (
                  <div key={meeting.id} className="flex items-center space-x-3 p-3 rounded-lg" style={{ backgroundColor: themeConfig.muted }}>
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

            {/* Task Summary */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Task Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center space-x-8">
                  <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-2">
                      <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-gray-200"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-blue-500"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          strokeDasharray={`${(completedTasks / totalTasks) * 100}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-medium" style={{ color: themeConfig.foreground }}>
                          {completedTasks}/{totalTasks}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm" style={{ color: themeConfig.mutedForeground }}>Completed</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <p className="text-sm" style={{ color: themeConfig.mutedForeground }}>On Track</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Goal */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Weekly Goal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
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

            {/* Today's Tasks */}
            <Card className="lg:col-span-1">
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

            {/* Active Projects */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Active Projects</span>
                  <Badge variant="outline" className="text-xs">{mockProjects.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                        className="text-xs"
                      >
                        {project.status}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs" style={{ color: themeConfig.mutedForeground }}>
                        <span>{project.progress}% complete</span>
                        <span>{project.tasks} tasks</span>
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

            {/* Analytics */}
            <Card className="lg:col-span-1">
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
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                    <div key={day} className="text-center">
                      <div className="text-xs font-medium mb-1" style={{ color: themeConfig.mutedForeground }}>
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

            {/* Quick Actions */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" size="sm" className="h-12">
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                  </Button>
                  <Button variant="outline" size="sm" className="h-12">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Schedule
                  </Button>
                  <Button variant="outline" size="sm" className="h-12">
                    <DocumentText className="h-4 w-4 mr-2" />
                    New Page
                  </Button>
                  <Button variant="outline" size="sm" className="h-12">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
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
  )
}
