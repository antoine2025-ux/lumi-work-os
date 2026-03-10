"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { FileText, X, Plus, Loader2, ExternalLink } from "lucide-react"
import { WikiPageSelector } from "@/components/projects/wiki-page-selector"
import Link from "next/link"

interface LinkedPage {
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
    projectDocumentation?: Array<{
      project: {
        id: string
        name: string
      }
    }>
  }
}

interface TaskLinkedPagesProps {
  taskId: string
  projectId: string
  workspaceSlug: string
}

export function TaskLinkedPages({ taskId, projectId, workspaceSlug }: TaskLinkedPagesProps) {
  const [linkedPages, setLinkedPages] = useState<LinkedPage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLinking, setIsLinking] = useState(false)
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)

  // Load linked pages
  const loadLinkedPages = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/tasks/${taskId}/wiki-links`)
      if (response.ok) {
        const data = await response.json()
        setLinkedPages(data || [])
      } else {
        console.error('Failed to load linked pages')
      }
    } catch (error) {
      console.error('Error loading linked pages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (taskId) {
      loadLinkedPages()
    }
  }, [taskId])

  // Handle linking a page
  const handleLinkPage = async (page: { id: string; title: string }) => {
    try {
      setIsLinking(true)
      const response = await fetch(`/api/tasks/${taskId}/wiki-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wikiPageId: page.id })
      })

      if (response.ok) {
        const newLink = await response.json()
        setLinkedPages(prev => [...prev, newLink])
        setIsSelectorOpen(false)
      } else {
        const errorText = await response.text()
        let errorMessage = 'Failed to link page'
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        console.error('Failed to link page:', errorMessage)
        alert(errorMessage)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Error linking page:', errorMessage)
      alert(`Failed to link page: ${errorMessage}`)
    } finally {
      setIsLinking(false)
    }
  }

  // Handle unlinking a page
  const handleUnlinkPage = async (wikiPageId: string) => {
    try {
      // Optimistically remove from list
      setLinkedPages(prev => prev.filter(link => link.wikiPageId !== wikiPageId))

      const response = await fetch(`/api/tasks/${taskId}/wiki-links?wikiPageId=${wikiPageId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        // Revert on error
        loadLinkedPages()
        const errorText = await response.text()
        let errorMessage = 'Failed to unlink page'
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        console.error('Failed to unlink page:', errorMessage)
        alert(errorMessage)
      }
    } catch (error) {
      // Revert on error
      loadLinkedPages()
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Error unlinking page:', errorMessage)
      alert(`Failed to unlink page: ${errorMessage}`)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Get already linked page IDs to exclude from selector
  const linkedPageIds = linkedPages.map(link => link.wikiPageId)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Linked Pages</h3>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => setIsSelectorOpen(true)}
          disabled={isLinking}
        >
          <Plus className="h-4 w-4 mr-1" />
          Link Page
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : linkedPages.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No linked pages. Link documentation to provide context for this task.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {linkedPages.map(link => {
            // Get unique projects from projectDocumentation
            const projects = link.wikiPage.projectDocumentation || []
            const uniqueProjects = Array.from(
              new Map(projects.map(pd => [pd.project.id, pd.project])).values()
            )

            return (
              <Card key={link.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <Link
                        href={`/wiki/${link.wikiPage.slug}`}
                        className="font-medium text-sm hover:underline truncate"
                      >
                        {link.wikiPage.title}
                      </Link>
                    </div>
                    
                    {uniqueProjects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {uniqueProjects.map(project => (
                          <Badge 
                            key={project.id} 
                            variant="secondary" 
                            className="text-xs"
                          >
                            {project.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated {formatDate(link.wikiPage.updatedAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-8 w-8 p-0"
                    >
                      <Link href={`/wiki/${link.wikiPage.slug}`} target="_blank">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlinkPage(link.wikiPageId)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <WikiPageSelector
        open={isSelectorOpen}
        onOpenChange={setIsSelectorOpen}
        onSelect={handleLinkPage}
        excludePageIds={linkedPageIds}
      />
    </div>
  )
}
