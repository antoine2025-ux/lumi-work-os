"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useWorkspace } from "@/lib/workspace-context"

/**
 * Workspace dashboard page
 * This is the main landing page for a workspace at /w/[workspaceSlug]
 * 
 * For now, this redirects to /home which has the full dashboard content.
 * TODO: Move dashboard content here or create a shared component.
 */
export default function WorkspaceDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const { currentWorkspace, isLoading } = useWorkspace()
  const workspaceSlug = params?.workspaceSlug as string

  useEffect(() => {
    // If workspace is loaded and slug matches, we're good
    // Otherwise redirect to home (which will eventually be moved here)
    if (!isLoading && currentWorkspace?.slug === workspaceSlug) {
      // For now, redirect to /home which has the dashboard content
      // In the future, we can move the dashboard content here
      router.replace('/home')
    }
  }, [workspaceSlug, currentWorkspace, isLoading, router])

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    </div>
  )
}
