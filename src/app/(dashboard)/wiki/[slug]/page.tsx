"use client"

import { useState, use, useEffect } from "react"
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
  const resolvedParams = use(params) as { slug: string }
  const searchParams = useSearchParams()
  const [isEditing, setIsEditing] = useState(searchParams?.get('edit') === 'true')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pageData, setPageData] = useState<any>(null)
  const [relatedPages, setRelatedPages] = useState<any[]>([])
  const [isStarred, setIsStarred] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

  // Load page data
  useEffect(() => {
    const loadPage = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/wiki/pages/${resolvedParams.slug}`)
        if (response.ok) {
          const page = await response.json()
          setPageData(page)
          loadRelatedPages(page)
        }
      } catch (error) {
        console.error('Error loading page:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPage()
  }, [resolvedParams.slug])

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/wiki">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  {isEditing ? (
                    <Input
                      value={pageData.title}
                      onChange={(e) => setPageData({...pageData, title: e.target.value})}
                      className="text-lg font-semibold border-none p-0 h-auto focus:ring-0"
                      placeholder="Page title..."
                    />
                  ) : (
                    <h1 className="text-lg font-semibold text-gray-900">{pageData.title}</h1>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </Button>
                  <Button 
                    onClick={handleCancel}
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={() => setIsStarred(!isStarred)}
                    variant="ghost"
                    size="sm"
                    className={`${isStarred ? 'text-yellow-500' : 'text-gray-400'} hover:text-yellow-500`}
                  >
                    <Star className={`h-4 w-4 ${isStarred ? 'fill-current' : ''}`} />
                  </Button>
                  <Button 
                    onClick={() => setIsBookmarked(!isBookmarked)}
                    variant="ghost"
                    size="sm"
                    className={`${isBookmarked ? 'text-blue-500' : 'text-gray-400'} hover:text-blue-500`}
                  >
                    <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    size="sm"
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {/* Page Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Page Info</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    <span>{pageData.createdBy?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{formatDate(pageData.updatedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Tag className="h-4 w-4" />
                    <span className="capitalize">{pageData.category || 'general'}</span>
                  </div>
                  {pageData.tags && pageData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {pageData.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Related Pages */}
              {relatedPages.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Related Pages</h3>
                  <div className="space-y-3">
                    {relatedPages.map((page) => (
                      <Link 
                        key={page.id} 
                        href={`/wiki/${page.slug}`}
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                            <FileText className="h-3 w-3 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{page.title}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              {isEditing ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content
                    </label>
                    <RichTextEditor
                      content={pageData.content}
                      onChange={(content) => setPageData({...pageData, content})}
                      placeholder="Start writing your page content..."
                    />
                  </div>
                </div>
              ) : (
                <div className="prose prose-gray max-w-none">
                  <div 
                    dangerouslySetInnerHTML={{ __html: pageData.content || '<p>No content available.</p>' }}
                    className="text-gray-700 leading-relaxed"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}