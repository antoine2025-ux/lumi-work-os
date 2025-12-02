"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"

/**
 * Project creation page - renders CreateProjectDialog in open state
 * This ensures backward compatibility with /projects/new route
 * while using the same dialog component as the projects list page
 */
export default function NewProjectPage() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(true)
  const [hasCreatedProject, setHasCreatedProject] = useState(false)
  // Use ref to track creation status to avoid closure issues
  const hasCreatedProjectRef = useRef(false)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    console.log('[ProjectsNewPage] onOpenChange', open, 'hasCreatedProject:', hasCreatedProjectRef.current)
    // Only navigate back to /projects if user closes/cancels without creating
    if (!open && !hasCreatedProjectRef.current) {
      console.log('[ProjectsNewPage] navigating to /projects (cancel/close without creation)')
      router.push('/projects')
    }
  }

  const handleProjectCreated = (project: { id: string }) => {
    console.log('[ProjectsNewPage] onProjectCreated', project.id)
    // Set both state and ref immediately to avoid closure issues
    hasCreatedProjectRef.current = true
    setHasCreatedProject(true)
    // Navigate to the newly created project detail page
    console.log('[ProjectsNewPage] navigating to /projects/' + project.id)
    router.push(`/projects/${project.id}`)
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
