import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      updates,
    }: {
      projectId: string
      updates: Record<string, unknown>
    }) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!response.ok) throw new Error('Update failed')
      return response.json()
    },
    onSuccess: (updatedProject) => {
      queryClient.setQueryData(['project', updatedProject.id], updatedProject)
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useInvalidateProject() {
  const queryClient = useQueryClient()

  return {
    invalidateProject: (projectId: string) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
    invalidateEpics: (projectId: string) => {
      queryClient.invalidateQueries({ queryKey: ['project-epics', projectId] })
    },
  }
}
