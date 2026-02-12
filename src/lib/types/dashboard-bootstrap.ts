/**
 * Dashboard Bootstrap Types
 * 
 * Minimal types for initial dashboard load data.
 * These types contain only the fields needed for initial render.
 */

export interface DashboardBootstrap {
  workspace: {
    id: string
    name?: string
  }
  projects: Array<{
    id: string
    name: string
    description?: string | null
    status: string
    priority?: string | null
    color?: string | null
    updatedAt: string
    createdAt: string
    taskCount?: number
    _count?: { tasks: number }
    userRole?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  }>
  wikiPages: Array<{
    id: string
    title: string
    slug: string
    excerpt?: string | null
    updatedAt: string
    createdAt: string
    category?: string | null
  }>
  pageCounts: Record<string, number>
  todos: Array<{
    id: string
    title: string
    status: 'OPEN' | 'DONE'
    dueAt?: string | null
    priority?: string | null
    createdAt: string
  }>
  taskSummary: {
    total: number
    todo: number
    inProgress: number
    done: number
    overdue: number
  }
}

