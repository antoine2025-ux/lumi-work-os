import { useQuery } from '@tanstack/react-query'

export interface ProjectTask {
  id: string
  title: string
  description: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  assigneeId: string | null
  assignee?: {
    id: string
    name: string | null
    email: string
  } | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
  epicId: string | null
  epic?: {
    id: string
    title: string
    color: string | null
  } | null
  createdBy?: {
    id: string
    name: string | null
    email: string
  }
  _count?: {
    subtasks: number
    comments: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface ProjectTasksResponse {
  tasks: ProjectTask[]
  pagination: Pagination
}

export function useProjectTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: async (): Promise<ProjectTasksResponse> => {
      if (!projectId) {
        return { tasks: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } }
      }
      // Fetch up to 200 tasks for client-side filtering/sorting (4 pages of 50)
      const limit = 200
      const response = await fetch(
        `/api/projects/${projectId}/tasks?page=1&limit=${limit}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch project tasks')
      }
      const data = await response.json()
      return {
        tasks: data.tasks ?? [],
        pagination: data.pagination ?? {
          page: 1,
          limit,
          total: data.tasks?.length ?? 0,
          pages: 1,
        },
      }
    },
    enabled: !!projectId,
  })
}
