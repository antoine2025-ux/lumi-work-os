"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog"

export default function NewTaskPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = params?.id as string
  
  const [isOpen, setIsOpen] = useState(false)
  
  // Get initial values from URL parameters
  const getInitialStatus = (): 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED' => {
    const status = searchParams.get('status')
    if (status && ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'].includes(status)) {
      return status as 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
    }
    return 'TODO'
  }
  
  const getInitialEpicId = (): string | null => {
    return searchParams.get('epicId')
  }

  useEffect(() => {
    if (projectId) {
      setIsOpen(true)
    }
  }, [projectId])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // Redirect back to project's Tasks tab when modal closes
      router.push(`/projects/${projectId}`)
    }
  }

  const handleTaskCreated = (task: any) => {
    // Redirect to the task's parent project
    router.push(`/projects/${projectId}`)
  }

  if (!projectId) {
    return null
  }

  return (
    <CreateTaskDialog
      open={isOpen}
      onOpenChange={handleOpenChange}
      projectId={projectId}
      defaultStatus={getInitialStatus()}
      defaultEpicId={getInitialEpicId()}
      onTaskCreated={handleTaskCreated}
    />
  )
}
