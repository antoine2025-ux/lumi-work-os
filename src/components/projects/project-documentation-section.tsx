"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { 
  FileText, 
  X, 
  Plus,
  ExternalLink,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { WikiPageSelector } from "./wiki-page-selector"
import { WikiPageBody } from "@/components/wiki/wiki-page-body"

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
  slug: string
  workspace_type: string | null
  updatedAt?: string
  createdBy?: {
    id: string
    name: string
  }
}

interface ProjectDocumentationSectionProps {
  projectId: string
  workspaceId: string
}

export function ProjectDocumentationSection({ 
  projectId, 
  workspaceId 
}: ProjectDocumentationSectionProps) {
  const [documentation, setDocumentation] = useState<ProjectDocumentation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAttaching, setIsAttaching] = useState(false)
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [selectedPageContent, setSelectedPageContent] = useState<WikiPageContent | null>(null)
  const [isLoadingContent, setIsLoadingContent] = useState(false)

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
        let errorDetails: any = null
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
    } catch (error) {
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
            content: pageData.content, // WikiPageBody will process code blocks
            slug: pageData.slug,
            workspace_type: pageData.workspace_type,
            updatedAt: pageData.updatedAt,
            createdBy: pageData.createdBy
          })
        } else {
          console.error('Failed to load wiki page content')
          setSelectedPageContent(null)
        }
      } catch (error) {
        console.error('Error loading wiki page content:', error)
        setSelectedPageContent(null)
      } finally {
        setIsLoadingContent(false)
      }
    }

    loadPageContent()
  }, [selectedDocId, documentation])

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
    } catch (error) {
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
    } catch (error) {
      // Revert on error
      loadDocumentation()
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Error detaching documentation:', errorMessage)
      alert(`Failed to detach documentation: ${errorMessage}`)
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
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsSelectorOpen(true)}
          disabled={isAttaching}
          aria-label="Attach documentation"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {documentation.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-muted rounded-lg">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No documentation attached yet. Attach relevant docs from Spaces so Loopbrain can see them.
          </p>
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
        excludePageIds={documentation.map(doc => doc.wikiPageId)}
      />
    </div>
  )
}

