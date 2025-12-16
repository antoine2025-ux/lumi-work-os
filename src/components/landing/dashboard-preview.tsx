"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Video, Phone, Calendar, FileText, Target, TrendingUp, RefreshCw } from "lucide-react"

export function DashboardPreview() {
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning!"
    if (hour < 17) return "Good afternoon!"
    return "Good evening!"
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return '1 day ago'
    if (diffInDays < 7) return `${diffInDays} days ago`
    return `${Math.floor(diffInDays / 7)} weeks ago`
  }

  const mockMeetings = [
    { id: "1", title: "Sprint Planning", time: "9:00 AM", duration: "1h", type: "video" as const, priority: "HIGH" as const, attendees: 5, team: "Engineering" },
    { id: "2", title: "Client Review", time: "2:00 PM", duration: "30m", type: "video" as const, priority: "MEDIUM" as const, attendees: 3, team: "Product" },
    { id: "3", title: "1:1 with Manager", time: "4:30 PM", duration: "30m", type: "phone" as const, priority: "MEDIUM" as const, attendees: 1 },
  ]

  const mockTasks = [
    { id: "1", title: "Review Q4 roadmap", priority: "HIGH" as const, category: "Product Strategy", dueDate: "Today", completed: false },
    { id: "2", title: "Update user documentation", priority: "MEDIUM" as const, category: "Documentation", dueDate: "Tomorrow", completed: false },
    { id: "3", title: "Code review for auth module", priority: "HIGH" as const, category: "Authentication", dueDate: "Friday", completed: true },
  ]

  const mockProjects = [
    { id: "1", name: "Website Redesign", status: "active" as const, taskCount: 12, updatedAt: "2025-01-14T10:00:00Z" },
    { id: "2", name: "Mobile App", status: "active" as const, taskCount: 8, updatedAt: "2025-01-13T15:30:00Z" },
    { id: "3", name: "API Integration", status: "active" as const, taskCount: 5, updatedAt: "2025-01-12T09:20:00Z" },
  ]

  const mockPages = [
    { id: "1", title: "Getting Started Guide", updatedAt: "2025-01-14T08:00:00Z" },
    { id: "2", title: "API Documentation", updatedAt: "2025-01-13T14:00:00Z" },
  ]

  const completedTasks = mockTasks.filter(task => task.completed).length
  const totalTasks = mockTasks.length

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 space-y-6">
      {/* Welcome Section */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-3xl font-light text-white mb-2">{getGreeting()} 👋</h3>
          <p className="text-lg text-slate-400">{formatDate(new Date())}</p>
        </div>
        
        {/* Progress Gauges */}
        <div className="flex items-center space-x-6">
          {/* Task Summary */}
          <div className="text-center">
            <div className="relative w-16 h-16 mb-2">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-700"
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
                <span className="text-sm font-medium text-white">
                  {completedTasks}/{totalTasks}
                </span>
              </div>
            </div>
            <p className="text-sm font-medium text-white">Tasks</p>
            <div className="flex items-center justify-center space-x-1 mt-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="text-xs text-slate-400">On Track</span>
            </div>
          </div>

          {/* Weekly Goal */}
          <div className="text-center">
            <div className="relative w-16 h-16 mb-2">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-700"
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
                <span className="text-sm font-semibold text-white">75%</span>
              </div>
            </div>
            <p className="text-sm font-medium text-white">Weekly Goal</p>
            <p className="text-xs text-slate-400">On track</p>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Today's Meetings */}
        <Card className="border-slate-700 bg-slate-900 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between text-white">
              <span>Today&apos;s Meetings</span>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                  {mockMeetings.length}
                </Badge>
                <button className="h-6 w-6 p-0 text-slate-400 hover:text-slate-300">
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[340px] overflow-y-auto">
            {mockMeetings.map((meeting) => (
              <div
                key={meeting.id}
                className="flex items-center space-x-3 p-3 rounded-lg bg-slate-800 hover:bg-slate-750 transition-colors cursor-pointer group"
              >
                <div className="flex-shrink-0">
                  {meeting.type === "video" ? (
                    <Video className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Phone className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-white">
                    {meeting.title}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <span>{meeting.time}</span>
                    <span>•</span>
                    <span>{meeting.duration}</span>
                    {meeting.attendees > 0 && (
                      <>
                        <span>•</span>
                        <span>{meeting.attendees} people</span>
                      </>
                    )}
                    {meeting.team && (
                      <>
                        <span>•</span>
                        <span>{meeting.team}</span>
                      </>
                    )}
                  </div>
                </div>
                <Badge
                  variant={meeting.priority === "HIGH" ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {meeting.priority}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Today's Tasks */}
        <Card className="border-slate-700 bg-slate-900 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between text-white">
              <span>Today&apos;s Tasks</span>
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                {mockTasks.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[340px] overflow-y-auto">
            {mockTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center space-x-3 p-3 rounded-lg bg-slate-800 hover:bg-slate-750 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      task.completed
                        ? "bg-green-500 border-green-500"
                        : "border-slate-500"
                    } flex items-center justify-center`}
                  >
                    {task.completed && <CheckCircle className="h-3 w-3 text-white" />}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${task.completed ? 'text-slate-500 line-through' : 'text-white'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <Badge
                      variant={task.priority === "HIGH" ? "destructive" : "secondary"}
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
        <Card className="border-slate-700 bg-slate-900 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between text-white">
              <span>Active Projects</span>
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                {mockProjects.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[340px] overflow-y-auto">
            {mockProjects.map((project) => (
              <div key={project.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        project.status === "active" ? "bg-green-500" : "bg-yellow-500"
                      }`}
                    />
                    <span className="text-sm font-medium text-white">
                      {project.name}
                    </span>
                  </div>
                  <Badge
                    variant={project.status === "active" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {project.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Progress tracking</span>
                    <span>{project.taskCount} tasks</span>
                  </div>
                  <Progress value={0} className="h-1" />
                  <div className="text-xs text-slate-400">
                    Updated: {getTimeAgo(project.updatedAt)}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Wiki Pages */}
        <Card className="border-slate-700 bg-slate-900 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between text-white">
              <span>Recent Pages</span>
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                {mockPages.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[340px] overflow-y-auto">
            {mockPages.map((page) => (
              <div
                key={page.id}
                className="flex items-center space-x-3 p-3 rounded-lg bg-slate-800 hover:bg-slate-750 transition-colors cursor-pointer"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-indigo-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-white">
                    {page.title}
                  </p>
                  <p className="text-xs text-slate-400">
                    Updated {getTimeAgo(page.updatedAt)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Analytics */}
        <Card className="border-slate-700 bg-slate-900 lg:col-span-2 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-center text-white">
              <span className="mr-2">Productivity Analytics</span>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center py-4">
            <div className="grid grid-cols-3 gap-4 max-w-2xl w-full">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">85%</div>
                <div className="text-xs text-slate-400">Productivity</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400 mb-1">6.5h</div>
                <div className="text-xs text-slate-400">Focus Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400 mb-1">92%</div>
                <div className="text-xs text-slate-400">Collaboration</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

