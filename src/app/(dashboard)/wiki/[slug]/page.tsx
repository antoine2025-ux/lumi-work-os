"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { WikiNavigation } from "@/components/wiki/wiki-navigation"
import { RichTextEditor } from "@/components/wiki/rich-text-editor"
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
import { useSearchParams } from "next/navigation"

interface WikiPageProps {
  params: Promise<{
    slug: string
  }>
}

export default function WikiPageDetail({ params }: WikiPageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ slug: string } | null>(null)
  const searchParams = useSearchParams()
  const [isEditing, setIsEditing] = useState(searchParams?.get('edit') === 'true')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pageData, setPageData] = useState<any>(null)
  const [relatedPages, setRelatedPages] = useState<any[]>([])
  const [isStarred, setIsStarred] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

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
      if (!currentPage.tags || currentPage.tags.length === 0) {
        setRelatedPages([])
        return
      }

      const response = await fetch('/api/wiki/pages?workspaceId=cmgl0f0wa00038otlodbw5jhn')
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Loading page...</p>
        </div>
      </div>
    )
  }

  if (!pageData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Page not found</h2>
          <p className="text-gray-600 mb-6">The page you're looking for doesn't exist.</p>
          <Link href="/wiki">
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Knowledge Base
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-white min-h-screen">
      {/* Main Editor Area - Clean Document */}
      <div className="flex-1 p-8 bg-white min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Page Info and Actions */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600 p-2 h-auto">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button 
                onClick={toggleFavorite}
                variant="ghost" 
                size="sm" 
                className={`p-2 h-auto ${isStarred ? 'text-yellow-500' : 'text-gray-400'} hover:text-yellow-500`}
              >
                <Star className={`h-4 w-4 ${isStarred ? 'fill-current' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600 p-2 h-auto">
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600 p-2 h-auto">
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600 p-2 h-auto">
                <Settings className="h-4 w-4" />
              </Button>
              {isEditing ? (
                <>
                  <Button 
                    onClick={handleSave}
                    disabled={isSaving}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-gray-600 p-2 h-auto"
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
                  className="text-gray-400 hover:text-gray-600 p-2 h-auto"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600 p-2 h-auto">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-gray-500">
              Last updated {formatDate(pageData.updatedAt)}
            </div>
          </div>

          {/* Title - Like Slite */}
          <div className="mb-8">
            {isEditing ? (
              <Input
                value={pageData.title}
                onChange={(e) => setPageData({...pageData, title: e.target.value})}
                className="text-4xl font-bold border-none p-0 h-auto focus:ring-0 focus:outline-none focus:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder-gray-400 bg-transparent"
                placeholder="Give your doc a title"
              />
            ) : (
              <h1 className="text-4xl font-bold text-gray-900">{pageData.title}</h1>
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
                <div className="flex items-center gap-6 text-sm text-gray-500 mt-8">
                  <button className="flex items-center gap-2 hover:text-gray-700">
                    <Settings className="h-4 w-4" />
                    Use a template
                  </button>
                  <button className="flex items-center gap-2 hover:text-gray-700">
                    <Download className="h-4 w-4" />
                    Import
                  </button>
                  <button className="flex items-center gap-2 hover:text-gray-700">
                    <FileText className="h-4 w-4" />
                    New subdoc
                  </button>
                  <button className="flex items-center gap-2 hover:text-gray-700">
                    <MoreHorizontal className="h-4 w-4" />
                    Convert to collection
                  </button>
                </div>
              </div>
            ) : (
              <div className="prose prose-gray max-w-none min-h-[400px]">
                <div 
                  dangerouslySetInnerHTML={{ __html: pageData.content || '<p>No content available.</p>' }}
                  className="text-gray-700 leading-relaxed"
                />
              </div>
            )}
          </div>

          {/* Cancel button when editing */}
          {isEditing && (
            <div className="fixed bottom-6 right-6">
              <Button 
                onClick={handleCancel}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}