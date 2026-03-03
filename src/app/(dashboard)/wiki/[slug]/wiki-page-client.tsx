"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/wiki/rich-text-editor"
import type { HocuspocusProvider } from '@hocuspocus/provider'
import { CollabPresence } from '@/components/wiki/CollabPresence'
import { usePresenceIdle } from '@/hooks/use-presence-idle'
import { useCollabProvider } from '@/hooks/use-collab-provider'

// Lazy-load: full TipTap + lowlight stack — only needed in edit mode, not read-only view
const WikiEditorShell = dynamic(
  () => import('@/components/wiki/wiki-editor-shell').then(m => ({ default: m.WikiEditorShell })),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse space-y-3 p-6">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-4 bg-muted rounded w-5/6" />
      </div>
    ),
  }
)
import { useLoopbrainAnchors } from "@/components/loopbrain/assistant-context"
import { WikiPageBody } from "@/components/wiki/wiki-page-body"
import { useUserStatusContext } from '@/providers/user-status-provider'
import { JSONContent, Editor } from '@tiptap/core'
import { 
  Check,
  Edit3,
  Share2,
  MessageSquare,
  Settings,
  Lock,
  Loader2,
  FileText,
  Trash2,
  MoreHorizontal,
  Star,
  Download,
  Eye,
  Brain
} from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { useActivePageStore } from "@/lib/stores/use-active-page-store"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TemplateSelector } from "@/components/wiki/TemplateSelector"
import { SaveAsTemplateDialog } from "@/components/wiki/SaveAsTemplateDialog"
import { EMPTY_TIPTAP_DOC } from "@/lib/wiki/constants"
import { useToast } from "@/components/ui/use-toast"

interface LinkedProject {
  id: string
  name: string
}

interface WikiPageData {
  id: string
  title: string
  slug: string
  content: string
  contentJson?: JSONContent | null
  contentFormat?: 'JSON' | 'HTML'
  excerpt?: string | null
  tags: string[]
  category: string
  isPublished: boolean
  updatedAt: string | Date
  is_featured?: boolean
  workspace_type?: string
  permissionLevel?: string
  linkedProjects?: LinkedProject[]
}

interface AuthorOrgInfo {
  userId: string
  name: string | null
  image: string | null
  orgTitle: string | null
  workspaceSlug: string
}

interface WikiPageClientProps {
  authorOrgInfo: AuthorOrgInfo | null
}

export default function WikiPageClient({ authorOrgInfo }: WikiPageClientProps) {
  const userStatus = useUserStatusContext()
  const router = useRouter()
  const queryClient = useQueryClient()
  const setActivePage = useActivePageStore((s) => s.setActivePage)
  const setActivePageTitle = useActivePageStore((s) => s.setActivePageTitle)
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const [isEditing, setIsEditing] = useState(searchParams?.get('edit') === 'true')
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<{ status: number; message: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [pageData, setPageData] = useState<WikiPageData | null>(null)
  const [_relatedPages, setRelatedPages] = useState<WikiPageData[]>([])
  const [isStarred, setIsStarred] = useState(false)
  const [_isBookmarked, _setIsBookmarked] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [showSaveAsTemplateDialog, setShowSaveAsTemplateDialog] = useState(false)
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const { toast } = useToast()
  const editorRef = useRef<(Editor & { saveNow?: () => Promise<void> }) | null>(null)
  /** Ref to preserve editor content when fetch completes; prevents overwrite with stale data */
  const syncedContentRef = useRef<JSONContent | null>(null)
  // Check URL params for AI assistant state on mount
  const initialAIOpen = searchParams?.get('ai') === 'open'
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(initialAIOpen)
  const [aiDisplayMode, setAiDisplayMode] = useState<'floating' | 'sidebar'>('floating')
  const [isEditorFocused, setIsEditorFocused] = useState(false)

  // Initialize collab provider for presence (works in both viewing and editing modes)
  const { provider: collabProvider } = useCollabProvider(
    pageData?.id ?? '',
    userStatus?.user?.id,
    null, // No initial content injection needed for presence-only
    userStatus?.user?.name ?? undefined
  )

  // Track presence idle state
  usePresenceIdle({
    provider: collabProvider,
    isEditorFocused,
  })

  // Register page context for Loopbrain (layout provides the launcher)
  useLoopbrainAnchors(pageData?.id ? { pageId: pageData.id } : {})

  // Get workspace ID from user status
  useEffect(() => {
    if (userStatus?.workspaceId) {
      // Workspace ID is now available from the shared hook
      // No need to fetch it separately
    }
  }, [userStatus])

  // Read slug from URL since params are no longer passed
  useEffect(() => {
    const pathParts = window.location.pathname.split('/')
    const slugIndex = pathParts.indexOf('wiki') + 1
    if (slugIndex > 0 && pathParts[slugIndex]) {
      setResolvedSlug(decodeURIComponent(pathParts[slugIndex]))
    }
  }, [])

  const toggleFavorite = async () => {
    if (!pageData) return
    
    try {
      if (isStarred) {
        // Remove from favorites
        await fetch(`/api/wiki/pages/${pageData.id}/favorite`, {
          method: 'DELETE'
        })
        setIsStarred(false)
      } else {
        // Add to favorites
        await fetch(`/api/wiki/pages/${pageData.id}/favorite`, {
          method: 'POST'
        })
        setIsStarred(true)
      }
      
      // Trigger a custom event to refresh favorites in the sidebar
      window.dispatchEvent(new CustomEvent('favoritesChanged'))
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const handleDeletePage = async () => {
    if (!pageData) {
      console.error('No page data available')
      return
    }
    
    
    if (!confirm('Are you sure you want to delete this page? This action cannot be undone.')) {
      return
    }

    try {
      setIsDeleting(true)
      
      // Use pageData.id if available, otherwise try by slug
      const pageIdOrSlug = pageData.id || resolvedSlug
      
      
      const response = await fetch(`/api/wiki/pages/${pageIdOrSlug}`, {
        method: 'DELETE'
      })


      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Delete failed:', errorData)
        throw new Error(errorData.error || 'Failed to delete page')
      }

      queryClient.invalidateQueries({ queryKey: ['sidebar-pages'] })
      window.dispatchEvent(new CustomEvent('pageDeleted'))
      window.dispatchEvent(new CustomEvent('favoritesChanged'))
      
      // Determine workspace and redirect accordingly
      const workspaceType = pageData.workspace_type || pageData.permissionLevel
      
      if (workspaceType === 'personal' || workspaceType === 'personal-space') {
        router.push('/wiki/personal-space')
      } else if (workspaceType === 'team' || workspaceType === 'team-workspace') {
        router.push('/wiki/team-workspace')
      } else if (workspaceType && workspaceType !== 'team' && workspaceType !== 'personal') {
        // Custom workspace
        router.push(`/wiki/workspace/${workspaceType}`)
      } else {
        // Default to home
        router.push('/wiki')
      }
    } catch (error) {
      console.error('Error deleting page:', error)
      alert(`Failed to delete page: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDeleting(false)
    }
  }

  // Load page data
  useEffect(() => {
    if (!resolvedSlug) return

    const loadPage = async () => {
      try {
        setIsLoading(true)
        setLoadError(null)
        // #region agent log
        const fetchUrl = `/api/wiki/pages/${encodeURIComponent(resolvedSlug)}`
        fetch('http://127.0.0.1:7242/ingest/2a79ccc7-8419-4f6b-84d3-31982e160042',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dc9fac'},body:JSON.stringify({sessionId:'dc9fac',location:'wiki-page-client.tsx:loadPage',message:'wiki loadPage fetch',data:{pathname:typeof window!=='undefined'?window.location.pathname:null,resolvedSlug,fetchUrl},timestamp:Date.now(),hypothesisId:'H1-H5'})}).catch(()=>{});
        // #endregion
        const response = await fetch(fetchUrl, {
          cache: 'no-store',
        })
        if (response.ok) {
          const page = await response.json()
          setPageData(page)
          setIsStarred(page.is_featured || false)
          setActivePage(page.id, page.title)
          loadRelatedPages(page)
          
          // Check if there's a pending page draft to stream
          const pendingDraft = sessionStorage.getItem('pendingPageDraft')
          
          if (pendingDraft) {
            try {
              const draftInfo = JSON.parse(pendingDraft)
              
              // More lenient matching: check title match OR recent timestamp (within 30 seconds)
              const titleMatches = page.title === draftInfo.title || page.title.toLowerCase() === draftInfo.title.toLowerCase()
              const timeDiff = Math.abs(Date.now() - draftInfo.timestamp)
              const isRecent = timeDiff < 30000 // 30 seconds
              
              
              if (titleMatches || isRecent) {
                
                // Clear session storage immediately
                sessionStorage.removeItem('pendingPageDraft')
                
                // Auto-enable edit mode
                setIsEditing(true)
                
                // Auto-open AI assistant
                setIsAISidebarOpen(true)
                setAiDisplayMode('floating')
                
                // Small delay to ensure page is fully loaded before streaming
                setTimeout(() => {
                  streamPageContent(page.id, draftInfo.prompt, draftInfo.workspaceId || userStatus?.workspaceId)
                }, 500)
              } else {
                // Clear stale draft
                if (timeDiff > 30000) {
                  sessionStorage.removeItem('pendingPageDraft')
                }
              }
            } catch (error) {
              console.error('❌ Error parsing pending draft:', error)
              sessionStorage.removeItem('pendingPageDraft')
            }
          } else {
          }
          
          // Also check URL params for AI assistant state
          if (searchParams?.get('ai') === 'open') {
            setIsAISidebarOpen(true)
            setAiDisplayMode('floating')
          }
        } else {
          let errorData: Record<string, unknown> = { error: 'Unknown error' }
          try {
            const text = await response.text()
            if (text) {
              errorData = JSON.parse(text) as Record<string, unknown>
            }
          } catch {
            // If JSON parsing fails, use status text
            errorData = { error: response.statusText || 'Unknown error' }
          }
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/2a79ccc7-8419-4f6b-84d3-31982e160042',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dc9fac'},body:JSON.stringify({sessionId:'dc9fac',location:'wiki-page-client.tsx:328',message:'wiki 404 client',data:{pathname:typeof window!=='undefined'?window.location.pathname:null,resolvedSlug,status:response.status,errorData},timestamp:Date.now(),hypothesisId:'H1-H5'})}).catch(()=>{});
          // #endregion
          console.error('Failed to load page:', response.status, response.statusText, errorData)
          const rawError = errorData?.error
          const errorMessage =
            (typeof rawError === 'object' && rawError !== null && 'message' in rawError
              ? String((rawError as Record<string, unknown>).message)
              : typeof rawError === 'string' ? rawError : null) ||
            (typeof errorData?.message === 'string' ? errorData.message : null) ||
            'Unknown error'
          setLoadError({ status: response.status, message: errorMessage })
          setPageData(null)
        }
      } catch (error) {
        console.error('Error loading page:', error)
        setLoadError({ status: 0, message: 'Network error — could not reach server' })
        setPageData(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadPage()
  }, [resolvedSlug])

  // Silent invariant: Warn if non-JSON page is opened in edit mode
  const formatWarningRef = useRef(false)
  
  // Reset warning latch when navigating to a new page
  useEffect(() => {
    formatWarningRef.current = false
  }, [resolvedSlug])

  useEffect(() => {
    // Only warn once per page load
    if (formatWarningRef.current) return
    // Only warn in edit mode
    if (!isEditing) return
    // Only warn if pageData is loaded
    if (!pageData) return

    // Warn if non-JSON page is opened in editor
    if (pageData.contentFormat !== 'JSON') {
      formatWarningRef.current = true
      console.warn('[WIKI] Non-JSON page opened in editor', {
        pageId: pageData.id,
        contentFormat: pageData.contentFormat,
        title: pageData.title,
        slug: pageData.slug,
      })
    }
  }, [isEditing, pageData, resolvedSlug])

  // Stream content generation for a page
  const streamPageContent = async (pageId: string, prompt: string, workspaceId?: string) => {
    try {
      setIsSaving(true)
      
      const response = await fetch('/api/ai/draft-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageId,
          prompt,
          workspaceId: workspaceId || userStatus?.workspaceId
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Streaming failed:', response.status, errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body reader available')
      }

      let buffer = ''
      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.error) {
                console.error('❌ Stream error:', data.error)
                throw new Error(data.error)
              }

              if (data.content) {
                accumulatedContent += data.content
                // Update page content in real-time as chunks arrive
                setPageData((prev) => {
                  if (!prev) return prev
                  return {
                    ...prev,
                    content: accumulatedContent
                  }
                })
              }

              if (data.done) {
                setIsSaving(false)
                // Reload page to get final state
                const reloadResponse = await fetch(`/api/wiki/pages/${resolvedSlug}`)
                if (reloadResponse.ok) {
                  const updatedPage = await reloadResponse.json()
                  setPageData(updatedPage)
                }
                return
              }
            } catch (e) {
              // Skip invalid JSON lines
              if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
                console.error('Error parsing stream data:', e)
              }
            }
          }
        }
      }

      setIsSaving(false)
    } catch (error) {
      console.error('❌ Error streaming page content:', error)
      setIsSaving(false)
    }
  }

  const loadRelatedPages = async (currentPage: WikiPageData) => {
    try {
      if (!currentPage.tags || currentPage.tags.length === 0 || !userStatus?.workspaceId) {
        setRelatedPages([])
        return
      }

      const response = await fetch(`/api/wiki/pages?workspaceId=${userStatus.workspaceId}`)
      if (response.ok) {
        const result = await response.json() as { data?: WikiPageData[] } | WikiPageData[]
        const allPages: WikiPageData[] = (Array.isArray(result) ? result : result.data) ?? []

        if (Array.isArray(allPages)) {
          const related = allPages
            .filter((page) => page.id !== currentPage.id)
            .filter((page) =>
              page.tags && page.tags.some((tag: string) =>
                currentPage.tags.includes(tag)
              )
            )
            .slice(0, 3)

          setRelatedPages(related)
        }
      }
    } catch (error) {
      console.error('Error loading related pages:', error)
      setRelatedPages([])
    }
  }

  const handleSave = async (contentJson?: JSONContent) => {
    if (!pageData) return
    
    try {
      setIsSaving(true)
      
      // Determine if this is a JSON page
      const isJSONPage = pageData.contentFormat === 'JSON'
      
      const response = await fetch(`/api/wiki/pages/${pageData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: pageData.title,
          ...(isJSONPage && contentJson 
            ? { contentJson, contentFormat: 'JSON' }
            : { content: pageData.content }
          ),
          excerpt: pageData.excerpt,
          tags: pageData.tags,
          category: pageData.category,
          isPublished: pageData.isPublished
        }),
      })

      if (response.ok) {
        // Update page data without exiting edit mode
        const updatedPage = await response.json()
        setPageData(updatedPage)
        // Do NOT set setIsEditing(false) - keep user in edit mode
      }
    } catch (error) {
      console.error('Error saving page:', error)
      throw error // Re-throw for autosave error handling
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleAutosave = async (contentJson: JSONContent) => {
    if (!pageData) return
    await handleSave(contentJson)
  }

  const toggleEdit = useCallback(async () => {
    if (isEditing) {
      if (pageData?.contentFormat === 'JSON' && editorRef.current) {
        const json = editorRef.current.getJSON()
        const html = editorRef.current.getHTML?.()
        syncedContentRef.current = json
        setPageData(prev =>
          prev ? { ...prev, contentJson: json, content: html ?? prev.content } : prev
        )
      }
      if (pageData?.contentFormat === 'JSON' && editorRef.current?.saveNow) {
        try {
          await editorRef.current.saveNow()
        } catch (e) {
          console.error('Failed to save before closing:', e)
        }
      } else if (pageData?.contentFormat === 'HTML') {
        await handleSave()
      }
      setIsEditing(false)
      try {
        const res = await fetch(`/api/wiki/pages/${pageData?.id || resolvedSlug}`)
        if (res.ok) {
          const updated = await res.json()
          setPageData(prev =>
            syncedContentRef.current && prev?.contentFormat === 'JSON'
              ? { ...updated, contentJson: syncedContentRef.current }
              : updated
          )
        }
      } catch (e) {
        console.error('Failed to refresh page data after Done:', e)
      }
      syncedContentRef.current = null
    } else {
      setIsEditing(true)
    }
  }, [isEditing, pageData, resolvedSlug])

  const handleUpgradePage = async () => {
    if (!pageData || pageData.contentFormat !== 'HTML') {
      return
    }

    try {
      setIsUpgrading(true)
      setShowUpgradeDialog(false)

      const response = await fetch(`/api/wiki/pages/${pageData.id}/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to upgrade page')
      }

      const result = await response.json()
      
      // Show warnings if any
      if (result.warnings && result.warnings.length > 0) {
        console.warn('Upgrade warnings:', result.warnings)
        // Could show a toast here
      }

      // Reload page data to get updated format
      const reloadResponse = await fetch(`/api/wiki/pages/${resolvedSlug}`)
      if (reloadResponse.ok) {
        const updatedPage = await reloadResponse.json()
        setPageData(updatedPage)
        // Page will now render with TipTap editor since contentFormat is JSON
      }
    } catch (error) {
      console.error('Error upgrading page:', error)
      alert(`Failed to upgrade page: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUpgrading(false)
    }
  }

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Derive initials for avatar fallback
  const authorInitials = authorOrgInfo?.name
    ? authorOrgInfo.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading page...</p>
        </div>
      </div>
    )
  }

  if (!pageData) {
    const isAuthError = loadError && (loadError.status === 401 || loadError.status === 403)
    const isServerError = loadError && loadError.status >= 500
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          {isAuthError ? (
            <>
              <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {loadError.status === 401 ? 'Sign in required' : 'Access denied'}
              </h2>
              <p className="text-muted-foreground">
                {loadError.status === 401
                  ? 'Please sign in to view this page.'
                  : 'You do not have permission to view this page.'}
              </p>
            </>
          ) : isServerError ? (
            <>
              <FileText className="h-16 w-16 mx-auto mb-4 text-destructive" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
              <p className="text-muted-foreground">An error occurred while loading this page. Please try again.</p>
            </>
          ) : (
            <>
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Page not found</h2>
              <p className="text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
      <div className="h-full bg-background min-h-screen w-full min-w-0 relative">
      {/* Floating Vertical Sidebar - Right Side */}
      <div className={cn(
        "fixed top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 transition-all duration-500 ease-in-out",
        isAISidebarOpen && aiDisplayMode === 'floating' 
          ? "right-[540px]" // Slide left when AI chat is open in floating mode (500px width + 40px gap)
          : isAISidebarOpen && aiDisplayMode === 'sidebar'
          ? "right-[400px]" // Slide left when AI chat is open in sidebar mode (384px width + 16px gap)
          : "right-8" // Default position
      )}>
        <Button
          onClick={toggleEdit}
          variant={isEditing ? "default" : "ghost"}
          size="sm"
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center p-0 bg-card/80 backdrop-blur-sm border border-border shadow-sm",
            isEditing && "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600"
          )}
          title={isEditing ? "Done" : "Edit"}
        >
          {isEditing ? (
            <Check className="h-4 w-4" />
          ) : (
            <Edit3 className="h-4 w-4" />
          )}
        </Button>
        {!isEditing && pageData?.contentFormat === 'HTML' && (
          <Button
            onClick={() => setShowUpgradeDialog(true)}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground w-10 h-10 rounded-full flex items-center justify-center p-0 bg-card/80 backdrop-blur-sm border border-border shadow-sm"
            title="Upgrade to new editor"
            disabled={isUpgrading}
          >
            {isUpgrading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </Button>
        )}
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground w-10 h-10 rounded-full flex items-center justify-center p-0 bg-card/80 backdrop-blur-sm border border-border shadow-sm" title="Share">
          <Share2 className="h-4 w-4" />
        </Button>
        <Button 
          onClick={toggleFavorite}
          variant="ghost" 
          size="sm" 
          className={`w-10 h-10 rounded-full flex items-center justify-center p-0 bg-card/80 backdrop-blur-sm border border-border shadow-sm ${isStarred ? 'text-yellow-500 hover:text-yellow-400' : 'text-muted-foreground hover:text-foreground'}`}
          title="Favorite"
        >
          <Star className={`h-4 w-4 ${isStarred ? 'fill-current' : ''}`} />
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground w-10 h-10 rounded-full flex items-center justify-center p-0 bg-card/80 backdrop-blur-sm border border-border shadow-sm" title="View">
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground w-10 h-10 rounded-full flex items-center justify-center p-0 bg-card/80 backdrop-blur-sm border border-border shadow-sm" title="Comments">
          <MessageSquare className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground w-10 h-10 rounded-full flex items-center justify-center p-0 bg-card/80 backdrop-blur-sm border border-border shadow-sm" title="AI Assistant">
          <Brain className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground w-10 h-10 rounded-full flex items-center justify-center p-0 bg-card/80 backdrop-blur-sm border border-border shadow-sm" title="More options">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDeletePage} disabled={isDeleting} className="text-red-600 focus:text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete page'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Editor Area - Clean Document */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background min-h-screen overflow-x-hidden w-full min-w-0">
        <div className="max-w-4xl mx-auto w-full min-w-0">
          {pageData?.linkedProjects && pageData.linkedProjects.length > 0 && authorOrgInfo && (
            <div className="mb-4 flex flex-wrap gap-2">
              {pageData.linkedProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/w/${authorOrgInfo.workspaceSlug}/projects/${project.id}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Part of {project.name}
                </Link>
              ))}
            </div>
          )}
          {isEditing ? (
            <>
              {/* Page Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 w-full min-w-0">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="text-sm text-muted-foreground">
                    Last updated {formatDate(pageData.updatedAt)}
                  </div>
                  {authorOrgInfo && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="text-muted-foreground/50">·</span>
                      {authorOrgInfo.image ? (
                        <img
                          src={authorOrgInfo.image}
                          alt={authorOrgInfo.name ?? 'Author'}
                          className="h-5 w-5 rounded-full object-cover"
                        />
                      ) : (
                        <span className="h-5 w-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-medium text-slate-300">
                          {authorInitials}
                        </span>
                      )}
                      <span>
                        {authorOrgInfo.name ?? 'Unknown'}
                        {authorOrgInfo.orgTitle && (
                          <span className="text-muted-foreground/60"> · {authorOrgInfo.orgTitle}</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Title - Like Slite */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <Input
                    value={pageData.title === "Untitled" ? "" : pageData.title}
                    onChange={(e) => {
                      const title = e.target.value || "Untitled"
                      setPageData({ ...pageData, title })
                      setActivePageTitle(title)
                    }}
                    onBlur={(e) => {
                      // Trim only when user leaves the field
                      const trimmed = e.target.value.trim() || "Untitled"
                      if (trimmed !== pageData.title) {
                        setPageData({ ...pageData, title: trimmed })
                        setActivePageTitle(trimmed)
                      }
                    }}
                    onKeyDown={(e) => {
                      // Prevent any global keyboard shortcuts from interfering with typing
                      e.stopPropagation()
                    }}
                    className="text-4xl font-bold border-none p-0 h-auto focus:ring-0 focus:outline-none focus:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder-muted-foreground bg-transparent text-foreground flex-1"
                    placeholder="Untitled"
                  />
                  {collabProvider && pageData.contentFormat === 'JSON' && (
                    <CollabPresence
                      provider={collabProvider}
                      currentUserId={userStatus?.user?.id}
                      currentUserName={userStatus?.user?.name ?? undefined}
                      showAvatars={true}
                      showViewingBadge={true}
                    />
                  )}
                </div>
              </div>

              {/* Content Editor - No Border */}
              <div className="min-h-[400px]">
              {pageData.contentFormat === 'JSON' ? (
                <WikiEditorShell
                  initialContent={pageData.contentJson as JSONContent | null}
                  onSave={handleAutosave}
                  placeholder="Click here to start writing"
                  className="min-h-[400px] border-none shadow-none bg-transparent"
                  pageId={pageData.id}
                  userId={userStatus?.user?.id}
                  userName={userStatus?.user?.name ?? undefined}
                  onEditorReady={(editor: Editor) => {
                    // Store editor ref for saveNow access
                    editorRef.current = editor as Editor & { saveNow?: () => Promise<void> }
                    // Ensure saveNow is available
                    const editorWithSave = editor as Editor & { saveNow?: () => Promise<void> }
                    if (editor && !editorWithSave.saveNow) {
                      // Wait a tick for WikiEditorShell to attach saveNow
                      setTimeout(() => {
                        editorRef.current = editor as Editor & { saveNow?: () => Promise<void> }
                      }, 100) // Slightly longer delay to ensure proper initialization
                    }

                    // Track editor focus for presence state
                    editor.on('focus', () => setIsEditorFocused(true))
                    editor.on('blur', () => setIsEditorFocused(false))
                  }}
                />
              ) : (
                  <RichTextEditor
                    content={pageData.content}
                    onChange={(content) => setPageData({...pageData, content})}
                    placeholder="Click here to start writing"
                    className="min-h-[400px] border-none shadow-none bg-transparent focus:ring-0 focus:outline-none"
                    showToolbar={false}
                  />
                )}
                {/* Action Suggestions - Only show when editing */}
                <div className="flex items-center gap-3 sm:gap-6 text-sm text-muted-foreground mt-8 flex-wrap overflow-x-auto w-full">
                  <button
                    type="button"
                    onClick={() => setShowTemplateDialog(true)}
                    className="flex items-center gap-2 hover:text-foreground whitespace-nowrap"
                  >
                    <Settings className="h-4 w-4 flex-shrink-0" />
                    Use a template
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSaveAsTemplateDialog(true)}
                    className="flex items-center gap-2 hover:text-foreground whitespace-nowrap"
                  >
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    Save as template
                  </button>
                  <button className="flex items-center gap-2 hover:text-foreground whitespace-nowrap">
                    <Download className="h-4 w-4 flex-shrink-0" />
                    Import
                  </button>
                  <button className="flex items-center gap-2 hover:text-foreground whitespace-nowrap">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    New subdoc
                  </button>
                  <button className="flex items-center gap-2 hover:text-foreground whitespace-nowrap">
                    <MoreHorizontal className="h-4 w-4 flex-shrink-0" />
                    Convert to collection
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Viewing Mode - Same layout as edit: metadata first, then title, then content */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 w-full min-w-0">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="text-sm text-muted-foreground">
                    Last updated {formatDate(pageData.updatedAt)}
                  </div>
                  {authorOrgInfo && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="text-muted-foreground/50">·</span>
                      {authorOrgInfo.image ? (
                        <img
                          src={authorOrgInfo.image}
                          alt={authorOrgInfo.name ?? "Author"}
                          className="h-5 w-5 rounded-full object-cover"
                        />
                      ) : (
                        <span className="h-5 w-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-medium text-slate-300">
                          {authorInitials}
                        </span>
                      )}
                      <span>
                        {authorOrgInfo.name ?? "Unknown"}
                        {authorOrgInfo.orgTitle && (
                          <span className="text-muted-foreground/60"> · {authorOrgInfo.orgTitle}</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <h1 className="text-4xl font-bold text-foreground flex-1">
                    {pageData.title}
                  </h1>
                  {collabProvider && pageData.contentFormat === 'JSON' && (
                    <CollabPresence
                      provider={collabProvider}
                      currentUserId={userStatus?.user?.id}
                      currentUserName={userStatus?.user?.name ?? undefined}
                      showAvatars={true}
                      showViewingBadge={true}
                    />
                  )}
                </div>
              </div>
              <WikiPageBody page={pageData} showOpenButton={false} showTitle={false} showMetadata={false} />
            </>
          )}
        </div>
      </div>

      {/* Save as Template dialog */}
      <SaveAsTemplateDialog
        open={showSaveAsTemplateDialog}
        onOpenChange={setShowSaveAsTemplateDialog}
        defaultName={pageData?.title ?? "Untitled"}
        isSaving={isSavingTemplate}
        onSave={async (values) => {
          setIsSavingTemplate(true)
          try {
            const editor = editorRef.current as (Editor & { getJSON?: () => JSONContent }) | null
            const content =
              pageData?.contentFormat === "JSON"
                ? (editor?.getJSON?.() ?? pageData.contentJson ?? EMPTY_TIPTAP_DOC)
                : EMPTY_TIPTAP_DOC
            const res = await fetch("/api/wiki/templates", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: values.name,
                description: values.description,
                category: values.category,
                content,
              }),
            })
            if (!res.ok) {
              const data = await res.json().catch(() => ({}))
              throw new Error(data.error ?? "Failed to save template")
            }
            toast({
              title: "Template saved",
              description: "Your template has been saved successfully",
            })
          } finally {
            setIsSavingTemplate(false)
          }
        }}
      />

      {/* Use a template dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-light text-2xl">Use a template</DialogTitle>
            <DialogDescription className="text-base font-light">
              Replace your content with a template
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0 py-2">
            <TemplateSelector
              onSelect={(template) => {
                setShowTemplateDialog(false)
                const editor = editorRef.current as (Editor & { commands?: { setContent: (c: JSONContent) => void } }) | null
                if (editor?.commands?.setContent) {
                  editor.commands.setContent(template?.content ?? EMPTY_TIPTAP_DOC)
                }
                if (template && pageData) {
                  setPageData({ ...pageData, contentJson: template.content as JSONContent })
                }
              }}
              onCancel={() => setShowTemplateDialog(false)}
              workspaces={[]}
              selectedWorkspaceId={null}
              onWorkspaceChange={() => {}}
              hideWorkspaceSelector
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Page to New Editor</DialogTitle>
            <DialogDescription>
              This will convert your page from HTML format to the new structured editor format.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>What will happen:</strong>
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
              <li>Your page will move to the new TipTap editor</li>
              <li>Formatting will be preserved as much as possible</li>
              <li>Original HTML is preserved for fallback/export</li>
              <li>Embed placeholders will be converted to embed nodes</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4">
              This action cannot be undone, but your original HTML content will remain in the database.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpgradeDialog(false)}
              disabled={isUpgrading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpgradePage}
              disabled={isUpgrading}
            >
              {isUpgrading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Upgrading...
                </>
              ) : (
                'Upgrade Page'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
