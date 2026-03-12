"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { 
  FileText, 
  X, 
  Plus,
  ExternalLink,
  Loader2,
  FilePlus
} from "lucide-react"
import { WikiPageSelector } from "./wiki-page-selector"
import { WikiPageBody } from "@/components/wiki/wiki-page-body"
import { EMPTY_TIPTAP_DOC } from "@/lib/wiki/constants"

interface ProjectDocumentation {
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

interface WikiPageContent {
  id: string
  title: string
  content: string
  contentFormat?: 'HTML' | 'JSON'
  contentJson?: Record<string, unknown>
  slug: string
  workspace_type: string | null
  updatedAt: string
  createdBy?: {
    id: string
    name: string
  }
}

interface ProjectDocumentationSectionProps {
  projectId: string
  projectName?: string
  workspaceId: string
}

export function ProjectDocumentationSection({ 
  projectId, 
  projectName,
  workspaceId 
}: ProjectDocumentationSectionProps) {
  const router = useRouter()
  const [documentation, setDocumentation] = useState<ProjectDocumentation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAttaching, setIsAttaching] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [selectedPageContent, setSelectedPageContent] = useState<WikiPageContent | null>(null)
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [projectSpaceId, setProjectSpaceId] = useState<string | null>(null) // Phase 1: Project's spaceId

  // Load attached documentation
  const loadDocumentation = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/projects/${projectId}/documentation`)
      if (response.ok) {
        const data = await response.json()
        setDocumentation(data || [])
        
        // Auto-select first doc if none selected and docs exist
        if (data && data.length > 0 && !selectedDocId) {
          setSelectedDocId(data[0].id)
        }
      } else {
        const errorText = await response.text()
        let errorMessage = response.statusText
        let errorDetails: string | null = null
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.error || errorMessage
          errorDetails = errorJson.details
        } catch {
          errorMessage = errorText || response.statusText
        }
        console.error('Failed to load documentation:', errorMessage)
        if (errorDetails) {
          console.error('Error details:', errorDetails)
        }
      }
    } catch (error: unknown) {
      console.error('Error loading documentation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Load wiki page content when selection changes
  useEffect(() => {
    const loadPageContent = async () => {
      if (!selectedDocId) {
        setSelectedPageContent(null)
        return
      }

      const selectedDoc = documentation.find(doc => doc.id === selectedDocId)
      if (!selectedDoc) {
        setSelectedPageContent(null)
        return
      }

      try {
        setIsLoadingContent(true)
        const response = await fetch(`/api/wiki/pages/${selectedDoc.wikiPageId}`)
        if (response.ok) {
          const pageData = await response.json()
          setSelectedPageContent({
            id: pageData.id,
            title: pageData.title,
            content: pageData.content || '', // Fallback to empty string for JSON pages
            contentFormat: pageData.contentFormat || 'HTML', // Default to HTML for legacy pages
            contentJson: pageData.contentJson || null, // Include JSON content for JSON pages
            slug: pageData.slug,
            workspace_type: pageData.workspace_type,
            updatedAt: pageData.updatedAt,
            createdBy: pageData.createdBy
          })
        } else {
          console.error('Failed to load wiki page content')
          setSelectedPageContent(null)
        }
      } catch (error: unknown) {
        console.error('Error loading wiki page content:', error)
        setSelectedPageContent(null)
      } finally {
        setIsLoadingContent(false)
      }
    }

    loadPageContent()
  }, [selectedDocId, documentation])

  // Load project spaceId
  useEffect(() => {
    const loadProjectSpaceId = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`)
        if (response.ok) {
          const project = await response.json()
          setProjectSpaceId(project.spaceId || null)
        }
      } catch (error: unknown) {
        console.error('Error loading project spaceId:', error)
      }
    }
    
    if (projectId) {
      loadProjectSpaceId()
    }
  }, [projectId])

  useEffect(() => {
    if (projectId) {
      loadDocumentation()
    }
  }, [projectId])

  // Handle attaching a new doc
  const handleAttach = async (page: { id: string; title: string }) => {
    try {
      setIsAttaching(true)
      const response = await fetch(`/api/projects/${projectId}/documentation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wikiPageId: page.id })
      })

      if (response.ok) {
        const newDoc = await response.json()
        // Optimistically add to list
        setDocumentation(prev => {
          const updated = [...prev, newDoc]
          // Auto-select the newly attached doc
          if (!selectedDocId) {
            setSelectedDocId(newDoc.id)
          }
          return updated
        })
        setIsSelectorOpen(false)
      } else {
        const errorText = await response.text()
        let errorMessage = 'Failed to attach documentation'
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        console.error('Failed to attach documentation:', errorMessage)
        alert(errorMessage)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Error attaching documentation:', errorMessage)
      alert(`Failed to attach documentation: ${errorMessage}`)
    } finally {
      setIsAttaching(false)
    }
  }

  // Handle detaching a doc
  const handleDetach = async (docId: string) => {
    try {
      // Optimistically remove from list
      setDocumentation(prev => {
        const updated = prev.filter(doc => doc.id !== docId)
        
        // Handle selection: if removed doc was selected, select another or clear
        if (selectedDocId === docId) {
          if (updated.length > 0) {
            setSelectedDocId(updated[0].id)
          } else {
            setSelectedDocId(null)
          }
        }
        
        return updated
      })

      const response = await fetch(`/api/projects/${projectId}/documentation/${docId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        // Revert on error
        loadDocumentation()
        const errorText = await response.text()
        let errorMessage = 'Failed to detach documentation'
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        console.error('Failed to detach documentation:', errorMessage)
        alert(errorMessage)
      }
    } catch (error: unknown) {
      // Revert on error
      loadDocumentation()
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Error detaching documentation:', errorMessage)
      alert(`Failed to detach documentation: ${errorMessage}`)
    }
  }

  // Handle creating a new wiki page and linking it to the project
  const handleCreateNewPage = async () => {
    if (!projectName) return
    try {
      setIsCreating(true)
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

      const newDoc = await linkRes.json()
      setDocumentation((prev) => [...prev, newDoc])
      setSelectedDocId(newDoc.id)
      router.push(`/wiki/${newPage.slug}?edit=true`)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to create page"
      console.error("Error creating project doc:", error)
      alert(msg)
    } finally {
      setIsCreating(false)
    }
  }

  // Get space label from workspace_type
  const getSpaceLabel = (workspaceType: string | null): string => {
    if (!workspaceType) return 'Team'
    if (workspaceType === 'personal') return 'Personal'
    if (workspaceType === 'team') return 'Team'
    return workspaceType // Custom space name
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {documentation.length > 0 && documentation.map((doc) => {
            const isSelected = doc.id === selectedDocId
            return (
              <Card 
                key={doc.id} 
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                  isSelected 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedDocId(doc.id)}
              >
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {doc.wikiPage.title}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {getSpaceLabel(doc.wikiPage.workspace_type)}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => window.open(`/wiki/${doc.wikiPage.slug}`, '_blank')}
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDetach(doc.id)}
                    title="Remove documentation"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {projectName && (
            <Button
              variant="default"
              size="sm"
              onClick={handleCreateNewPage}
              disabled={isCreating}
              aria-label="Create new page"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FilePlus className="h-4 w-4" />
              )}
              <span className="ml-1.5">New Page</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsSelectorOpen(true)}
            disabled={isAttaching}
            aria-label="Attach existing documentation"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {documentation.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-muted rounded-lg">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-4">
            No documentation yet. Create your first page or attach existing docs from Spaces.
          </p>
          <div className="flex items-center justify-center gap-2">
            {projectName && (
              <Button
                variant="default"
                size="sm"
                onClick={handleCreateNewPage}
                disabled={isCreating}
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <FilePlus className="h-4 w-4 mr-2" />
                )}
                New Page
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSelectorOpen(true)}
              disabled={isAttaching}
            >
              <Plus className="h-4 w-4 mr-2" />
              Attach existing
            </Button>
          </div>
        </div>
      ) : (
        <>

          {/* Wiki Page Preview - Using shared WikiPageBody component */}
          {selectedPageContent && (
            <>
              {isLoadingContent ? (
                <div className="flex items-center justify-center py-8 mt-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                // Use same padding as native wiki page, but no bg-background wrapper
                <div className="p-4 sm:p-6 lg:p-8 mt-6">
                  <WikiPageBody 
                    page={selectedPageContent} 
                    showOpenButton={true}
                  />
                </div>
              )}
            </>
          )}
          
          {!selectedPageContent && documentation.length > 0 && (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Select a document above to preview it here.
              </p>
            </div>
          )}
        </>
      )}

      {/* Wiki Page Selector Dialog */}
      <WikiPageSelector
        open={isSelectorOpen}
        onOpenChange={setIsSelectorOpen}
        onSelect={handleAttach}
        workspaceId={workspaceId}
        spaceId={projectSpaceId || undefined} // Phase 1: Filter by project's spaceId if available
        excludePageIds={documentation.map(doc => doc.wikiPageId)}
      />
    </div>
  )
}

