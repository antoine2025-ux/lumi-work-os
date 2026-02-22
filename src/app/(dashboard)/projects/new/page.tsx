"use client"

import { useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"

/**
 * Project creation page - renders CreateProjectDialog in open state.
 * Backward-compatible /projects/new route.
 * Accepts optional ?spaceId= query param to pre-select a space.
 */
export default function NewProjectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialSpaceId = searchParams.get('spaceId') ?? undefined
  const [isOpen, setIsOpen] = useState(true)
  const [_hasCreatedProject, setHasCreatedProject] = useState(false)
  // Use ref to track creation status to avoid closure issues
  const hasCreatedProjectRef = useRef(false)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    // Only navigate back to /projects if user closes/cancels without creating
    if (!open && !hasCreatedProjectRef.current) {
      router.push('/projects')
    }
  }

  const handleProjectCreated = (project: { id: string }) => {
    // Set both state and ref immediately to avoid closure issues
    hasCreatedProjectRef.current = true
    setHasCreatedProject(true)
    // Navigate to the newly created project detail page
    router.push(`/projects/${project.id}`)
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
