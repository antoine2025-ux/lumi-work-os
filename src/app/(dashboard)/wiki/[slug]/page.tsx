"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WikiNavigation } from "@/components/wiki/wiki-navigation"
import { RichTextEditor } from "@/components/wiki/rich-text-editor"
import { WikiEditorShell } from "@/components/wiki/wiki-editor-shell"
import { LoopbrainAssistantLauncher } from "@/components/loopbrain/assistant-launcher"
import { WikiPageBody } from "@/components/wiki/wiki-page-body"
import { useUserStatusContext } from '@/providers/user-status-provider'
import { JSONContent } from '@tiptap/core'
import { 
  Edit3,
  Save,
  X,
  Clock,
  User,
  Tag,
  Share2,
  History,
  MessageSquare,
  Settings,
  Lock,
  Loader2,
  FileText,
  Trash2,
  MoreHorizontal,
  Star,
  Bookmark,
  Copy,
  Download,
  Eye,
  EyeOff,
  Brain
} from "lucide-react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
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

interface WikiPageProps {
  params: Promise<{
    slug: string
  }>
}

export default function WikiPageDetail({ params }: WikiPageProps) {
  // Use centralized UserStatusContext - no separate API call needed
  const userStatus = useUserStatusContext()
  const router = useRouter()
  const [resolvedParams, setResolvedParams] = useState<{ slug: string } | null>(null)
  const searchParams = useSearchParams()
  const [isEditing, setIsEditing] = useState(searchParams?.get('edit') === 'true')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pageData, setPageData] = useState<any>(null)
  const [relatedPages, setRelatedPages] = useState<any[]>([])
  const [isStarred, setIsStarred] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const editorRef = useRef<{ saveNow: () => Promise<void> } | null>(null)
  // Check URL params for AI assistant state on mount
  const initialAIOpen = searchParams?.get('ai') === 'open'
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(initialAIOpen)
  const [aiDisplayMode, setAiDisplayMode] = useState<'floating' | 'sidebar'>('floating')

  // Get workspace ID from user status
  useEffect(() => {
    if (userStatus?.workspaceId) {
      // Workspace ID is now available from the shared hook
      // No need to fetch it separately
    }
  }, [userStatus])

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
    
    console.log('Deleting page:', { id: pageData.id, slug: resolvedParams?.slug })
    
    if (!confirm('Are you sure you want to delete this page? This action cannot be undone.')) {
      return
    }

    try {
      setIsDeleting(true)
      
      // Use pageData.id if available, otherwise try by slug
      const pageIdOrSlug = pageData.id || resolvedParams?.slug
      
      console.log('Sending DELETE request to:', `/api/wiki/pages/${pageIdOrSlug}`)
      
      const response = await fetch(`/api/wiki/pages/${pageIdOrSlug}`, {
        method: 'DELETE'
      })

      console.log('Delete response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Delete failed:', errorData)
        throw new Error(errorData.error || 'Failed to delete page')
      }

      // Trigger custom event to refresh sidebar
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

  // Resolve params
  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params
      console.log('Resolved params:', resolved)
      setResolvedParams(resolved)
    }
    resolveParams()
  }, [params])

  // Load page data
  useEffect(() => {
    if (!resolvedParams?.slug) return

    const loadPage = async () => {
      try {
        setIsLoading(true)
        console.log('Loading page with slug:', resolvedParams.slug)
        const response = await fetch(`/api/wiki/pages/${resolvedParams.slug}`)
        console.log('Response status:', response.status)
        if (response.ok) {
          const page = await response.json()
          console.log('Page data loaded:', page)
          setPageData(page)
          setIsStarred(page.is_featured || false)
          loadRelatedPages(page)
          
          // Check if there's a pending page draft to stream
          const pendingDraft = sessionStorage.getItem('pendingPageDraft')
          console.log('🔍 Checking for pending draft:', pendingDraft ? 'Found' : 'Not found')
          
          if (pendingDraft) {
            try {
              const draftInfo = JSON.parse(pendingDraft)
              console.log('📝 Found pending draft:', draftInfo)
              console.log('📄 Current page:', { id: page.id, title: page.title, slug: resolvedParams?.slug })
              
              // More lenient matching: check title match OR recent timestamp (within 30 seconds)
              const titleMatches = page.title === draftInfo.title || page.title.toLowerCase() === draftInfo.title.toLowerCase()
              const timeDiff = Math.abs(Date.now() - draftInfo.timestamp)
              const isRecent = timeDiff < 30000 // 30 seconds
              
              console.log('🔍 Matching check:', { 
                titleMatches, 
                isRecent, 
                timeDiff, 
                draftTitle: draftInfo.title,
                pageTitle: page.title
              })
              
              if (titleMatches || isRecent) {
                console.log('✅ Draft matches page, starting streaming in 500ms...')
                
                // Clear session storage immediately
                sessionStorage.removeItem('pendingPageDraft')
                
                // Auto-enable edit mode
                setIsEditing(true)
                
                // Auto-open AI assistant
                setIsAISidebarOpen(true)
                setAiDisplayMode('floating')
                
                // Small delay to ensure page is fully loaded before streaming
                setTimeout(() => {
                  console.log('🚀 Starting streamPageContent now...')
                  streamPageContent(page.id, draftInfo.prompt, draftInfo.workspaceId || userStatus?.workspaceId)
                }, 500)
              } else {
                console.log('❌ Draft does not match page:', { titleMatches, isRecent, timeDiff })
                // Clear stale draft
                if (timeDiff > 30000) {
                  console.log('🗑️ Clearing stale draft (older than 30s)')
                  sessionStorage.removeItem('pendingPageDraft')
                }
              }
            } catch (error) {
              console.error('❌ Error parsing pending draft:', error)
              sessionStorage.removeItem('pendingPageDraft')
            }
          } else {
            console.log('ℹ️ No pending draft found in sessionStorage')
          }
          
          // Also check URL params for AI assistant state
          if (searchParams?.get('ai') === 'open') {
            setIsAISidebarOpen(true)
            setAiDisplayMode('floating')
          }
        } else {
          let errorData: any = { error: 'Unknown error' }
          try {
            const text = await response.text()
            if (text) {
              errorData = JSON.parse(text)
            }
          } catch (e) {
            // If JSON parsing fails, use status text
            errorData = { error: response.statusText || 'Unknown error' }
          }
          console.error('Failed to load page:', response.status, response.statusText, errorData)
          // Set pageData to null to show the "Page not found" UI
          setPageData(null)
        }
      } catch (error) {
        console.error('Error loading page:', error)
        // Set pageData to null to show the "Page not found" UI
        setPageData(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadPage()
  }, [resolvedParams?.slug])

  // Silent invariant: Warn if non-JSON page is opened in edit mode
  const formatWarningRef = useRef(false)
  
  // Reset warning latch when navigating to a new page
  useEffect(() => {
    formatWarningRef.current = false
  }, [resolvedParams?.slug])

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
  }, [isEditing, pageData, resolvedParams?.slug])

  // Stream content generation for a page
  const streamPageContent = async (pageId: string, prompt: string, workspaceId?: string) => {
    try {
      console.log('🚀 Starting content streaming:', { pageId, prompt: prompt.substring(0, 50), workspaceId })
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
      console.log('📡 Starting to read stream...')

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('✅ Stream complete, final content length:', accumulatedContent.length)
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
                setPageData((prev: any) => {
                  if (!prev) return prev
                  return {
                    ...prev,
                    content: accumulatedContent
                  }
                })
              }

              if (data.done) {
                console.log('✅ Streaming done, finalizing...')
                setIsSaving(false)
                // Reload page to get final state
                const reloadResponse = await fetch(`/api/wiki/pages/${resolvedParams?.slug}`)
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

  const loadRelatedPages = async (currentPage: any) => {
    try {
      if (!currentPage.tags || currentPage.tags.length === 0 || !userStatus?.workspaceId) {
        setRelatedPages([])
        return
      }

      const response = await fetch(`/api/wiki/pages?workspaceId=${userStatus.workspaceId}`)
      if (response.ok) {
        const result = await response.json()
        const allPages = result.data || result
        
        if (Array.isArray(allPages)) {
          const related = allPages
            .filter((page: any) => page.id !== currentPage.id)
            .filter((page: any) => 
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

  const handleCancel = async () => {
    // For JSON pages, save before closing to ensure no data loss
    if (pageData.contentFormat === 'JSON' && editorRef.current?.saveNow) {
      try {
        // Save latest content before closing
        await editorRef.current.saveNow()
      } catch (error) {
        console.error('Failed to save before closing:', error)
        // Continue with close anyway - autosave may have already saved
      }
    }
    
    setIsEditing(false)
    // Reload to get latest saved state
    window.location.reload()
  }

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
      const reloadResponse = await fetch(`/api/wiki/pages/${resolvedParams?.slug}`)
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  console.log('Render state:', { isLoading, pageData, resolvedParams })

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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Page not found</h2>
          <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
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
        {isEditing ? (
          <>
            <Button 
              onClick={async () => {
                if (pageData.contentFormat === 'JSON') {
                  // Always use editor's saveNow function (reads latest from editor)
                  if (editorRef.current?.saveNow) {
                    try {
                      await editorRef.current.saveNow()
                      // Update pageData after successful save to keep state in sync
                      const reloadResponse = await fetch(`/api/wiki/pages/${pageData.id}`)
                      if (reloadResponse.ok) {
                        const updatedPage = await reloadResponse.json()
                        setPageData(updatedPage)
                      }
                    } catch (error) {
                      console.error('Save failed:', error)
                      // Error state is handled by WikiEditorShell
                    }
                  } else {
                    console.error('Editor ref not available - cannot save')
                    alert('Editor not ready. Please wait a moment and try again.')
                  }
                } else {
                  // HTML page - use existing handleSave
                  handleSave()
                }
              }}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed w-10 h-10 rounded-full flex items-center justify-center p-0"
              title={isSaving ? 'Saving...' : 'Save'}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
            <Button 
              onClick={handleCancel}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground w-10 h-10 rounded-full flex items-center justify-center p-0 bg-card/80 backdrop-blur-sm border border-border shadow-sm"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button 
              onClick={() => setIsEditing(true)}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground w-10 h-10 rounded-full flex items-center justify-center p-0 bg-card/80 backdrop-blur-sm border border-border shadow-sm"
              title="Edit"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            {pageData?.contentFormat === 'HTML' && (
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
          </>
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
          {isEditing ? (
            <>
              {/* Page Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 w-full min-w-0">
                <div className="text-sm text-muted-foreground">
                  Last updated {formatDate(pageData.updatedAt)}
                </div>
              </div>

              {/* Title - Like Slite */}
              <div className="mb-8">
                <Input
                  value={pageData.title}
                  onChange={(e) => setPageData({...pageData, title: e.target.value})}
                  className="text-4xl font-bold border-none p-0 h-auto focus:ring-0 focus:outline-none focus:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder-muted-foreground bg-transparent text-foreground"
                  placeholder="Give your doc a title"
                />
              </div>

              {/* Content Editor - No Border */}
              <div className="min-h-[400px]">
              {pageData.contentFormat === 'JSON' ? (
                <WikiEditorShell
                  initialContent={pageData.contentJson as JSONContent | null}
                  onSave={handleAutosave}
                  placeholder="Click here to start writing"
                  className="min-h-[400px] border-none shadow-none bg-transparent"
                  onEditorReady={(editor) => {
                    // Store editor ref for saveNow access
                    editorRef.current = editor as any
                    // Ensure saveNow is available
                    if (editor && !(editor as any).saveNow) {
                      // Wait a tick for WikiEditorShell to attach saveNow
                      setTimeout(() => {
                        editorRef.current = editor as any
                      }, 0)
                    }
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
                  <button className="flex items-center gap-2 hover:text-foreground whitespace-nowrap">
                    <Settings className="h-4 w-4 flex-shrink-0" />
                    Use a template
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
            <WikiPageBody page={pageData} showOpenButton={false} />
          )}
        </div>
      </div>

      {/* Global Loopbrain Assistant */}
      <LoopbrainAssistantLauncher 
        mode="spaces" 
        anchors={{ pageId: pageData?.id }} 
      />

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