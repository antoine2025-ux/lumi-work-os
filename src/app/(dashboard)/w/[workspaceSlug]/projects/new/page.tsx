"use client"

import { useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"

/**
 * Workspace-scoped project creation page
 * Renders CreateProjectDialog in open state with workspace-scoped navigation
 */
export default function NewProjectPage() {
  const router = useRouter()
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string
  const [isOpen, setIsOpen] = useState(true)
  const [hasCreatedProject, setHasCreatedProject] = useState(false)
  // Use ref to track creation status to avoid closure issues
  const hasCreatedProjectRef = useRef(false)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    console.log('[ProjectsNewPage] onOpenChange', open, 'hasCreatedProject:', hasCreatedProjectRef.current)
    // Only navigate back to projects list if user closes/cancels without creating
    if (!open && !hasCreatedProjectRef.current) {
      console.log('[ProjectsNewPage] navigating to projects list (cancel/close without creation)')
      router.push(`/w/${workspaceSlug}/projects`)
    }
  }

  const handleProjectCreated = (project: { id: string }) => {
    console.log('[ProjectsNewPage] onProjectCreated', project.id)
    // Set both state and ref immediately to avoid closure issues
    hasCreatedProjectRef.current = true
    setHasCreatedProject(true)
    // Navigate to the newly created project detail page (workspace-scoped)
    console.log('[ProjectsNewPage] navigating to project:', `/w/${workspaceSlug}/projects/${project.id}`)
    router.push(`/w/${workspaceSlug}/projects/${project.id}`)
  }

  return (
    <div className="min-h-screen">
      <CreateProjectDialog
        open={isOpen}
        onOpenChange={handleOpenChange}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  )
}
