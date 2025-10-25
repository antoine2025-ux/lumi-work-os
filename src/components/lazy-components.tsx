import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Lazy-loaded components to improve LCP
 */

// Heavy dashboard components
export const KanbanBoard = dynamic(
  () => import('@/components/kanban/kanban-board').then(mod => ({ default: mod.KanbanBoard })),
  {
    loading: () => <div className="animate-pulse bg-gray-100 h-96 rounded-lg" />,
    ssr: false
  }
)

export const TaskList = dynamic(
  () => import('@/components/tasks/task-list'),
  {
    loading: () => <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse bg-gray-100 h-16 rounded-lg" />
      ))}
    </div>,
    ssr: false
  }
)

export const WikiEditor = dynamic(
  () => import('@/components/wiki/rich-text-editor'),
  {
    loading: () => <div className="animate-pulse bg-gray-100 h-64 rounded-lg" />,
    ssr: false
  }
)

export const AIAssistant = dynamic(
  () => import('@/components/ai/assistant'),
  {
    loading: () => <div className="animate-pulse bg-gray-100 h-32 rounded-lg" />,
    ssr: false
  }
)

export const ProjectAnalytics = dynamic(
  () => import('@/components/projects/project-analytics'),
  {
    loading: () => <div className="animate-pulse bg-gray-100 h-48 rounded-lg" />,
    ssr: false
  }
)

// Chart components (usually heavy)
export const ProjectCharts = dynamic(
  () => import('@/components/charts/project-charts'),
  {
    loading: () => <div className="animate-pulse bg-gray-100 h-64 rounded-lg" />,
    ssr: false
  }
)

// Real-time components
export const LiveTaskList = dynamic(
  () => import('@/components/realtime/live-task-list'),
  {
    loading: () => <div className="animate-pulse bg-gray-100 h-32 rounded-lg" />,
    ssr: false
  }
)

export const PresenceIndicator = dynamic(
  () => import('@/components/realtime/presence-indicator'),
  {
    loading: () => <div className="animate-pulse bg-gray-100 h-8 w-8 rounded-full" />,
    ssr: false
  }
)

// Calendar components
export const CalendarView = dynamic(
  () => import('@/components/tasks/calendar-view'),
  {
    loading: () => <div className="animate-pulse bg-gray-100 h-96 rounded-lg" />,
    ssr: false
  }
)

// Search components
export const AdvancedSearch = dynamic(
  () => import('@/components/search/advanced-search'),
  {
    loading: () => <div className="animate-pulse bg-gray-100 h-12 rounded-lg" />,
    ssr: false
  }
)
