"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import {
  Plus,
  BookOpen,
  Bot,
  Sparkles,
  CheckCircle,
  AlertCircle,
  BarChart3,
  CheckSquare,
  TrendingUp,
  Mail,
  Bell,
} from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { OrgSetupBanner } from "@/components/onboarding/org-setup-banner"
import { LoopbrainWelcomeCard } from "@/components/dashboard/loopbrain-welcome-card"

// Lazy load heavy components
const MeetingsCard = dynamic(() => import("@/components/dashboard/meetings-card").then(mod => ({ default: mod.MeetingsCard })), {
  loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" />,
  ssr: false
})

const TodaysTodosCard = dynamic(() => import("@/components/dashboard/todays-todos-card").then(mod => ({ default: mod.TodaysTodosCard })), {
  loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" />,
  ssr: false
})

const ProjectsCard = dynamic(() => import("@/components/dashboard/projects-card").then(mod => ({ default: mod.ProjectsCard })), {
  loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" />,
  ssr: false
})

const EmailWidget = dynamic(() => import("@/components/dashboard/email-widget").then(mod => ({ default: mod.EmailWidget })), {
  loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" />,
  ssr: false
})

const NotificationsWidget = dynamic(() => import("@/components/dashboard/notifications-widget").then(mod => ({ default: mod.NotificationsWidget })), {
  loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" />,
  ssr: false
})

const QuickActions = dynamic(() => import("@/components/dashboard/quick-actions").then(mod => ({ default: mod.QuickActions })), {
  loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" />,
  ssr: false
})

interface Task {
  id: string
  title: string
  status: string
  dueDate: Date | null
  projectId: string
  project?: {
    id: string
    name: string
  }
}

interface Project {
  id: string
  name: string
  status: string
  ownerId?: string | null
  updatedAt: Date
  members?: Array<{ role: string }>
  tasks?: Array<{ id: string; status: string }>
  userRole?: string
}

interface PendingApproval {
  id: string
  personId: string
  leaveType: string
  startDate: Date
  endDate: Date
}

interface RecentPage {
  id: string
  title: string
  slug: string
  updatedAt: Date
  category?: string | null
}

interface Todo {
  id: string
  title: string
  status: 'OPEN' | 'DONE'
  dueAt: Date | null
}

interface DashboardClientProps {
  user: {
    userId: string
    name?: string
    email: string
  }
  workspaceSlug: string
  companyType?: string | null
  capacity: {
    totalCapacity: number
    allocatedHours: number
    utilizationPct: number
  }
  tasks: {
    overdue: Task[]
    todo: Task[]
    inProgress: Task[]
    done: Task[]
    total: number
  }
  projects: Project[]
  pendingApprovals: PendingApproval[]
  recentPages: RecentPage[]
  taskSummary: {
    total: number
    todo: number
    inProgress: number
    done: number
    overdue: number
  }
  todos: Todo[]
}

export default function DashboardClient({
  user,
  workspaceSlug,
  companyType,
  capacity,
  tasks,
  projects,
  pendingApprovals,
  recentPages,
  taskSummary,
  todos,
}: DashboardClientProps) {
  const { theme, themeConfig } = useTheme()
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every second
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
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
    return `${Math.floor(diffInSeconds / 604800)} weeks ago`
  }

  const completedTodos = todos.filter((todo) => todo.status === 'DONE').length
  const totalTodos = todos.length
  const taskCompletionPct = taskSummary.total > 0 ? Math.round((taskSummary.done / taskSummary.total) * 100) : 0

  return (
    <div className="flex min-h-screen bg-background" data-testid="dashboard-container">
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Onboarding Banner */}
        <OrgSetupBanner workspaceSlug={workspaceSlug} />

        {/* Loopbrain first-visit welcome */}
        <LoopbrainWelcomeCard
          companyType={companyType}
          userName={user.name}
          userId={user.userId}
          className="mb-6"
        />



        {/* Dashboard Grid - 3x2 Layout */}
        <div className="dashboard-grid">
          {/* Row 1: Calendar - Email - Notifications */}
          <MeetingsCard />
          <EmailWidget />
          <NotificationsWidget />

          {/* Row 2: To-do - Projects - Quick Actions */}
          <TodaysTodosCard />
          <ProjectsCard projects={projects} workspaceSlug={workspaceSlug} />
          <QuickActions workspaceSlug={workspaceSlug} />
        </div>
        </div>
      </main>

      <style jsx global>{`
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(2, 320px);
          gap: 1.5rem;
        }

        .dashboard-grid > * {
          min-height: 0;
          min-width: 0;
        }

        .dashboard-grid.compressed {
          max-width: calc(100vw - 320px - 3rem);
        }

        .widget-card {
          border-radius: 0.5rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--card));
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .widget-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          padding: 1rem 1rem 0.75rem 1rem;
          border-bottom: 1px solid hsl(var(--border));
          flex-shrink: 0;
        }

        .widget-header-start {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 0;
        }

        .widget-title {
          font-weight: 600;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .widget-content {
          flex: 1;
          min-height: 0;
          padding: 1rem;
          overflow-y: auto;
        }

        .widget-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  )
}
