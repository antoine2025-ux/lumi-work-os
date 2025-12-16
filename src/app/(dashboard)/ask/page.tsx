"use client"

/**
 * LEGACY ROUTE - Redirects to slug-based URL
 * 
 * TODO: Remove this file once all internal links point to /w/[workspaceSlug]/ask
 * This is a transitional redirect to maintain backward compatibility.
 */

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWorkspace } from "@/lib/workspace-context"

export default function LegacyAskPage() {
  const router = useRouter()
  const { currentWorkspace, isLoading } = useWorkspace()

  useEffect(() => {
    if (isLoading) return

    if (currentWorkspace?.slug) {
      router.replace(`/w/${currentWorkspace.slug}/ask`)
    } else {
      router.replace('/')
    }
  }, [currentWorkspace, isLoading, router])

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Redirecting to LoopBrain...</p>
        </div>
      </div>
    </div>
  )
}
