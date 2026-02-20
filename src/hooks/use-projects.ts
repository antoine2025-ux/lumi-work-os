import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useUserStatusContext } from '@/providers/user-status-provider'

export interface Project {
  id: string
  name: string
  description?: string
  status: string
  color?: string
  updatedAt?: string
  createdAt?: string
}

export function useProjects(workspaceIdOverride?: string) {
  const { workspaceId: contextWorkspaceId } = useUserStatusContext()
  const workspaceId = workspaceIdOverride ?? contextWorkspaceId

  return useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: async () => {
      const response = await fetch(`/api/projects?workspaceId=${workspaceId}`)
      if (!response.ok) throw new Error('Failed to fetch projects')
      const data = await response.json()
      return (Array.isArray(data) ? data : (data.data || data.projects || [])) as Project[]
    },
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null
      const response = await fetch(`/api/projects/${projectId}`)
      if (!response.ok) {
        if (response.status === 404) throw new Error('Project not found')
        if (response.status === 403) throw new Error('Access denied')
        throw new Error('Failed to fetch project')
      }
      const data = await response.json()
      return { ...data, tasks: data.tasks || [] }
    },
    enabled: !!projectId,
  })
}

export function useProjectEpics(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-epics', projectId],
    queryFn: async () => {
      if (!projectId) return []
      const response = await fetch(`/api/projects/${projectId}/epics`)
      if (!response.ok) throw new Error('Failed to fetch epics')
      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
    enabled: !!projectId,
  })
}

export function useProjectPrefetch() {
  const queryClient = useQueryClient()

  return {
    prefetchProjects: (workspaceId: string) => {
      queryClient.prefetchQuery({
        queryKey: ['projects', workspaceId],
        queryFn: async () => {
          const response = await fetch(`/api/projects?workspaceId=${workspaceId}`)
          if (!response.ok) throw new Error('Failed to fetch projects')
          const data = await response.json()
          return Array.isArray(data) ? data : (data.data || data.projects || [])
        },
        staleTime: 2 * 60 * 1000,
      })
    }
  }
}



