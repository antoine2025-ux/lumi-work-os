"use client"

import { ReactNode } from "react"
import { useParams } from "next/navigation"
import { useWorkspace } from "@/lib/workspace-context"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Workspace slug layout - validates workspace access and ensures context is set
 * This layout wraps all workspace-specific pages under /w/[workspaceSlug]/
 * 
 * The parent (dashboard) layout already provides:
 * - Authentication checks
 * - Header with WorkspaceSwitcher
 * - Main content wrapper
 * 
 * This layout:
 * - Validates that the slug matches a workspace the user has access to
 * - Ensures workspace context is properly set
 * - Redirects if workspace is not accessible
 */
export default function WorkspaceSlugLayout({
  children,
}: {
  children: ReactNode
}) {
  const params = useParams()
  const workspaceSlug = params?.workspaceSlug as string
  const { currentWorkspace, workspaces, isLoading } = useWorkspace()
  const router = useRouter()

  // Validate workspace access when slug changes
  useEffect(() => {
    if (isLoading || !workspaceSlug) return

    // Check if current workspace matches the slug
    if (currentWorkspace?.slug === workspaceSlug) {
      // Valid - workspace context is already set
      return
    }

    // Check if user has access to this workspace
    const workspace = workspaces.find(w => w.slug === workspaceSlug)
    if (!workspace) {
      // Workspace not found in user's workspaces - redirect to current workspace or dashboard
      if (currentWorkspace) {
        router.replace(`/w/${currentWorkspace.slug}`)
      } else {
        router.replace('/')
      }
      return
    }

    // Workspace found but not current - switch to it
    // The WorkspaceSwitcher will handle the actual switch, but we can trigger it here
    // Actually, let's just redirect to ensure consistency
    // The workspace context will be updated by the WorkspaceProvider
  }, [workspaceSlug, currentWorkspace, workspaces, isLoading, router])

  // Show loading state while validating
  if (isLoading || !workspaceSlug) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-8 w-64 bg-slate-900 rounded animate-pulse" />
          <div className="h-32 w-full bg-slate-900 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  // Validate workspace access
  const workspace = workspaces.find(w => w.slug === workspaceSlug)
  if (!workspace) {
    // Will redirect in useEffect, but show loading in meantime
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Redirecting...</p>
          </div>
        </div>
      </div>
    )
  }

  // Valid workspace - render children
  return <>{children}</>
}
