"use client"

import { useState, useRef } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"

/**
 * Workspace-scoped project creation page
 * Renders CreateProjectDialog in open state with workspace-scoped navigation.
 * Accepts optional ?spaceId= query param to pre-select a space.
 */
export default function NewProjectPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const workspaceSlug = params.workspaceSlug as string
  const initialSpaceId = searchParams.get('spaceId') ?? undefined
  const [isOpen, setIsOpen] = useState(true)
  const [_hasCreatedProject, setHasCreatedProject] = useState(false)
  // Use ref to track creation status to avoid closure issues
  const hasCreatedProjectRef = useRef(false)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    // Only navigate back to projects list if user closes/cancels without creating
    if (!open && !hasCreatedProjectRef.current) {
      router.push(`/w/${workspaceSlug}/projects`)
    }
  }

  const handleProjectCreated = (project: { id: string }) => {
    // Set both state and ref immediately to avoid closure issues
    hasCreatedProjectRef.current = true
    setHasCreatedProject(true)
    // Navigate to the newly created project detail page (workspace-scoped)
    router.push(`/w/${workspaceSlug}/projects/${project.id}`)
  }

  return (
    <div className="min-h-screen">
      <CreateProjectDialog
        open={isOpen}
        onOpenChange={handleOpenChange}
        initialSpaceId={initialSpaceId}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  )
}
