"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { WikiNavigation } from "@/components/wiki/wiki-navigation"
import { RichTextEditor } from "@/components/wiki/rich-text-editor"
import { WikiAIAssistant } from "@/components/wiki/wiki-ai-assistant"
import { useUserStatus } from '@/hooks/use-user-status'
import { 
  ArrowLeft,
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
  EyeOff
} from "lucide-react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface WikiPageProps {
  params: Promise<{
    slug: string
  }>
}

export default function WikiPageDetail({ params }: WikiPageProps) {
  const { userStatus } = useUserStatus()
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
        } else {
          console.error('Failed to load page:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('Error loading page:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPage()
  }, [resolvedParams?.slug])

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

  const handleSave = async () => {
    if (!pageData) return
    
    try {
      setIsSaving(true)
      const response = await fetch(`/api/wiki/pages/${pageData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: pageData.title,
          content: pageData.content,
          excerpt: pageData.excerpt,
          tags: pageData.tags,
          category: pageData.category,
          isPublished: pageData.isPublished
        }),
      })

      if (response.ok) {
        setIsEditing(false)
        // Reload page data
        const updatedPage = await response.json()
        setPageData(updatedPage)
      }
    } catch (error) {
      console.error('Error saving page:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Reload original data
    window.location.reload()
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
          <p className="text-muted-foreground mb-6">The page you're looking for doesn't exist.</p>
          <Link href="/wiki">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Knowledge Base
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-background min-h-screen">
      {/* Main Editor Area - Clean Document */}
      <div className="flex-1 p-8 bg-background min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Page Info and Actions */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground p-2 h-auto">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button 
                onClick={toggleFavorite}
                variant="ghost" 
                size="sm" 
                className={`p-2 h-auto ${isStarred ? 'text-yellow-500' : 'text-muted-foreground'} hover:text-yellow-500`}
              >
                <Star className={`h-4 w-4 ${isStarred ? 'fill-current' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground p-2 h-auto">
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground p-2 h-auto">
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground p-2 h-auto">
                <Settings className="h-4 w-4" />
              </Button>
              {isEditing ? (
                <>
                  <Button 
                    onClick={handleSave}
                    disabled={isSaving}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground p-2 h-auto"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => setIsEditing(true)}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground p-2 h-auto"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground p-2 h-auto">
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
            <div className="text-sm text-muted-foreground">
              Last updated {formatDate(pageData.updatedAt)}
            </div>
          </div>

          {/* Title - Like Slite */}
          <div className="mb-8">
            {isEditing ? (
              <Input
                value={pageData.title}
                onChange={(e) => setPageData({...pageData, title: e.target.value})}
                className="text-4xl font-bold border-none p-0 h-auto focus:ring-0 focus:outline-none focus:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder-muted-foreground bg-transparent text-foreground"
                placeholder="Give your doc a title"
              />
            ) : (
              <h1 className="text-4xl font-bold text-foreground">{pageData.title}</h1>
            )}
          </div>

          {/* Content Editor - No Border */}
          <div className="min-h-[400px]">
            {isEditing ? (
              <div>
                <RichTextEditor
                  content={pageData.content}
                  onChange={(content) => setPageData({...pageData, content})}
                  placeholder="Click here to start writing"
                  className="min-h-[400px] border-none shadow-none bg-transparent focus:ring-0 focus:outline-none"
                  showToolbar={false}
                />
                {/* Action Suggestions - Only show when editing */}
                <div className="flex items-center gap-6 text-sm text-muted-foreground mt-8">
                  <button className="flex items-center gap-2 hover:text-foreground">
                    <Settings className="h-4 w-4" />
                    Use a template
                  </button>
                  <button className="flex items-center gap-2 hover:text-foreground">
                    <Download className="h-4 w-4" />
                    Import
                  </button>
                  <button className="flex items-center gap-2 hover:text-foreground">
                    <FileText className="h-4 w-4" />
                    New subdoc
                  </button>
                  <button className="flex items-center gap-2 hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                    Convert to collection
                  </button>
                </div>
              </div>
            ) : (
              <div className="prose prose-foreground max-w-none min-h-[400px] dark:prose-invert">
                {(() => {
                  // Check if content is HTML or Markdown
                  const isHtml = pageData.content?.includes('<') && (
                    pageData.content.includes('<div') || 
                    pageData.content.includes('<p>') || 
                    pageData.content.includes('<h1') ||
                    pageData.content.includes('<ul') ||
                    pageData.content.includes('<ol')
                  )
                  
                  if (isHtml) {
                    return (
                      <div 
                        dangerouslySetInnerHTML={{ __html: pageData.content || '<p>No content available.</p>' }}
                        className="text-foreground leading-relaxed"
                      />
                    )
                  } else {
                    // Render Markdown - basic rendering without external library
                    const markdownToHtml = (md: string) => {
                      let html = md
                      
                      // Headers
                      html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mb-3 mt-6">$1</h3>')
                      html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mb-4 mt-8">$1</h2>')
                      html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-6 mt-8">$1</h1>')
                      
                      // Bold
                      html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>')
                      
                      // Lists
                      html = html.replace(/^\- (.*$)/gim, '<li class="mb-1">$1</li>')
                      html = html.replace(/^(\d+)\. (.*$)/gim, '<li class="mb-1">$2</li>')
                      
                      // Wrap consecutive list items in ul/ol
                      html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => {
                        if (match.includes('</li>')) {
                          return '<ul class="list-disc pl-6 mb-4 space-y-1">' + match + '</ul>'
                        }
                        return match
                      })
                      
                      // Paragraphs
                      html = html.replace(/\n\n/g, '</p><p class="mb-4 leading-relaxed">')
                      html = '<p class="mb-4 leading-relaxed">' + html + '</p>'
                      
                      // Clean up empty paragraphs
                      html = html.replace(/<p class="mb-4 leading-relaxed"><\/p>/g, '')
                      html = html.replace(/<p class="mb-4 leading-relaxed">(<h[123])/g, '$1')
                      html = html.replace(/(<\/h[123]>)<\/p>/g, '$1')
                      
                      return html
                    }
                    
                    return (
                      <div 
                        dangerouslySetInnerHTML={{ __html: markdownToHtml(pageData.content || 'No content available.') }}
                        className="text-foreground leading-relaxed"
                      />
                    )
                  }
                })()}
              </div>
            )}
          </div>

          {/* Cancel button when editing */}
          {isEditing && (
            <div className="fixed bottom-6 right-6">
              <Button 
                onClick={handleCancel}
                variant="outline"
                  className="border-border text-foreground hover:bg-accent"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* AI Assistant */}
      <WikiAIAssistant 
        currentPageId={pageData?.id}
        currentTitle={pageData?.title || ''}
        currentContent={pageData?.content || ''}
        onContentUpdate={(newContent) => {
          if (pageData) {
            setPageData({ ...pageData, content: newContent })
          }
        }}
        onTitleUpdate={(newTitle) => {
          if (pageData) {
            setPageData({ ...pageData, title: newTitle })
          }
        }}
      />
    </div>
  )
}