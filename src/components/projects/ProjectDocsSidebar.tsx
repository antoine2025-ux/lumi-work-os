"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import {
  FileText,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { EMPTY_TIPTAP_DOC } from "@/lib/wiki/constants"

interface ProjectDoc {
  id: string
  wikiPageId: string
  order: number
  createdAt: string
  wikiPage: {
    id: string
    title: string
    slug: string
    workspace_type: string | null
    updatedAt: string
  }
}

export interface ProjectDocsSidebarProps {
  projectId: string
  projectName: string
  workspaceId: string
  workspaceSlug?: string
}

export function ProjectDocsSidebar({
  projectId,
  projectName,
  workspaceSlug,
}: ProjectDocsSidebarProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["project-documentation", projectId],
    queryFn: async (): Promise<ProjectDoc[]> => {
      const response = await fetch(`/api/projects/${projectId}/documentation`)
      if (!response.ok) throw new Error("Failed to fetch documentation")
      return response.json()
    },
    enabled: !!projectId,
  })

  const createAndLinkMutation = useMutation({
    mutationFn: async () => {
      const createRes = await fetch("/api/wiki/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${projectName} — New Page`,
          contentJson: EMPTY_TIPTAP_DOC,
          contentFormat: "JSON",
          workspace_type: "team",
          type: "PROJECT_DOC",
        }),
      })
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}))
        throw new Error(err.error || "Failed to create page")
      }
      const newPage = await createRes.json()

      const linkRes = await fetch(`/api/projects/${projectId}/documentation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wikiPageId: newPage.id }),
      })
      if (!linkRes.ok) {
        const err = await linkRes.json().catch(() => ({}))
        throw new Error(err.error || "Failed to link page to project")
      }

      return newPage
    },
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: ["project-documentation", projectId] })
      router.push(`/wiki/${newPage.slug}?edit=true`)
    },
  })

  const wikiBasePath = "/wiki"

  const handleNewPage = () => {
    createAndLinkMutation.mutate()
  }

  const handleDocClick = (slug: string) => {
    router.push(`${wikiBasePath}/${slug}`)
  }

  const isCreating = createAndLinkMutation.isPending

  if (isCollapsed) {
    return (
      <TooltipProvider>
        <div
          className={cn(
            "flex flex-col items-center py-4 border rounded-lg bg-card",
            "w-12 shrink-0"
          )}
        >
          <Tooltip content="Documentation" side="left">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(false)}
              aria-label="Expand documentation"
            >
              <FileText className="h-5 w-5" />
            </Button>
          </Tooltip>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(false)}
            className="mt-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </TooltipProvider>
    )
  }

  return (
    <div className="w-[280px] shrink-0 flex flex-col border rounded-lg bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 p-3 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium truncate">Documentation</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={handleNewPage}
            disabled={isCreating}
            aria-label="Create new page"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsCollapsed(true)}
            aria-label="Collapse sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-2 max-h-[400px]">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="py-6 px-3 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground mb-3">
              No documentation yet. Create your first page.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewPage}
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              New Page
            </Button>
          </div>
        ) : (
          <ul className="space-y-1">
            {docs.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => handleDocClick(doc.wikiPage.slug)}
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-md text-left",
                    "hover:bg-muted transition-colors"
                  )}
                >
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {doc.wikiPage.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(doc.wikiPage.updatedAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
