"use client"

import { useState, use, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { WikiNavigation } from "@/components/wiki/wiki-navigation"
import { RichTextEditor } from "@/components/wiki/rich-text-editor"
import { PermissionBadge } from "@/components/permissions/permission-badge"
import { PermissionManager } from "@/components/permissions/permission-manager"
import { VersionHistory } from "@/components/wiki/version-history"
import { EmbedContentRenderer } from "@/components/wiki/embed-content-renderer"
import { PermissionLevel, PermissionService } from "@/lib/permissions"
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
  Trash2
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
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true')
  const [showPermissionManager, setShowPermissionManager] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pageData, setPageData] = useState<any>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [originalTitle, setOriginalTitle] = useState("")
  const [originalContent, setOriginalContent] = useState("")
  const [relatedPages, setRelatedPages] = useState<any[]>([])
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('team' as PermissionLevel)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [category, setCategory] = useState('general')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Handle permission level change
  const handlePermissionChange = async (newLevel: PermissionLevel) => {
    try {
      const response = await fetch(`/api/wiki/pages/${pageData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permissionLevel: newLevel
        }),
      })

      if (response.ok) {
        setPermissionLevel(newLevel)
        // Update page data
        setPageData({ ...pageData, permissionLevel: newLevel })
      }
    } catch (error) {
      console.error('Error updating permission level:', error)
    }
  }

  // Handle version restore
  const handleVersionRestore = async (version: any) => {
    try {
      const response = await fetch(`/api/wiki/pages/${pageData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: version.content
        }),
      })

      if (response.ok) {
        setContent(version.content)
        setOriginalContent(version.content)
        setPageData({ ...pageData, content: version.content })
        setShowVersionHistory(false)
        // Reload the page to get updated data
        window.location.reload()
      }
    } catch (error) {
      console.error('Error restoring version:', error)
    }
  }

  // Helper function to strip HTML tags
  const stripHtml = (html: string) => {
    if (!html) return ''
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
  }

  // Helper function to format dates
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Load related pages based on tags
  const loadRelatedPages = async (currentPage: any) => {
    try {
      if (!currentPage.tags || currentPage.tags.length === 0) {
        setRelatedPages([])
        return
      }

      const response = await fetch('/api/wiki/pages?workspaceId=workspace-1')
      if (response.ok) {
        const allPages = await response.json()
        
        // Find pages with similar tags (excluding current page)
        const related = allPages
          .filter((page: any) => page.id !== currentPage.id)
          .filter((page: any) => 
            page.tags && page.tags.some((tag: string) => 
              currentPage.tags.includes(tag)
            )
          )
          .slice(0, 3) // Limit to 3 related pages
        
        setRelatedPages(related)
      }
    } catch (error) {
      console.error('Error loading related pages:', error)
      setRelatedPages([])
    }
  }

  // Load page data
  useEffect(() => {
    const loadPage = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/wiki/pages/${resolvedParams.slug}`)
        if (!response.ok) {
          throw new Error('Page not found')
        }
        const data = await response.json()
        setPageData(data)
        setTitle(data.title)
        setContent(data.content)
        setOriginalTitle(data.title)
        setOriginalContent(data.content)
        setPermissionLevel(data.permissionLevel || 'team')
        setCategory(data.category || 'general')
        
        // Load related pages
        await loadRelatedPages(data)
      } catch (error) {
        console.error('Error loading page:', error)
        // Fallback to mock data for now
        const mockData = {
          id: "1",
          title: "Company Policies",
          slug: resolvedParams.slug,
          content: `<h1>Company Policies</h1>

<p>Welcome to our company policies page. This document outlines the key policies and procedures that guide our organization.</p>

<h2>Remote Work Policy</h2>

<p>Our company supports flexible work arrangements. Here are the key guidelines:</p>

<ul>
<li><strong>Core Hours</strong>: 10 AM - 3 PM EST for team collaboration</li>
<li><strong>Communication</strong>: Use Slack for urgent matters, email for non-urgent</li>
<li><strong>Equipment</strong>: Company provides laptop and necessary software</li>
<li><strong>Workspace</strong>: Maintain a professional workspace for video calls</li>
</ul>

<h2>Code of Conduct</h2>

<p>We expect all team members to:</p>

<ol>
<li>Treat everyone with respect and dignity</li>
<li>Maintain confidentiality of sensitive information</li>
<li>Collaborate effectively with team members</li>
<li>Deliver work on time and to quality standards</li>
</ol>

<h2>Benefits and Perks</h2>

<ul>
<li>Health insurance coverage</li>
<li>401(k) matching up to 4%</li>
<li>Flexible PTO policy</li>
<li>Professional development budget</li>
<li>Home office stipend</li>
</ul>

<h2>Questions?</h2>

<p>If you have questions about any policy, please reach out to HR or your manager.</p>`,
          tags: ["policies", "hr", "guidelines"],
          updatedAt: "2024-01-15",
          author: "John Doe",
          authorId: "user-1",
          views: 156,
          lastViewed: "2024-01-15T10:30:00Z"
        }
        setPageData(mockData)
        setTitle(mockData.title)
        setContent(mockData.content)
        setOriginalTitle(mockData.title)
        setOriginalContent(mockData.content)
      } finally {
        setIsLoading(false)
      }
    }

    loadPage()
  }, [resolvedParams.slug])

  const handleSave = async () => {
    if (!pageData?.id) return
    
    try {
      setIsSaving(true)
      const response = await fetch(`/api/wiki/pages/${pageData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content,
          tags: pageData.tags || [],
          category: category
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save page')
      }

      const updatedPage = await response.json()
      setPageData(updatedPage)
      setOriginalTitle(title)
      setOriginalContent(content)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving page:', error)
      // You might want to show a toast notification here
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Reset to original content
    setTitle(originalTitle)
    setContent(originalContent)
  }

  // Handle delete page
  const handleDelete = async () => {
    if (!pageData?.id) return
    
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/wiki/pages/${pageData.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete page')
      }

      // Redirect to wiki home after successful deletion
      window.location.href = '/wiki'
    } catch (error) {
      console.error('Error deleting page:', error)
      alert('Failed to delete page. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  // Permission checks
  // const currentUser = PermissionService.getCurrentUser()
  // const canEdit = PermissionService.canUserEditResource(currentUser.id, resolvedParams.slug, 'page')
  // const canManagePermissions = PermissionService.canUserManagePermissions(currentUser.id, resolvedParams.slug, 'page')
  // const permissionLevel = PermissionService.getResourcePermissionLevel(resolvedParams.slug)
  
  // Mock values for now
  const currentUser = { id: "user-1", role: "Owner" }
  const canEdit = true
  const canManagePermissions = true

  if (isLoading) {
    return (
      <div className="flex h-full">
        <WikiNavigation currentPath={`/wiki/${resolvedParams.slug}`} />
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading page...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!pageData) {
    return (
      <div className="flex h-full">
        <WikiNavigation currentPath={`/wiki/${resolvedParams.slug}`} />
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
            <p className="text-muted-foreground mb-4">The page you're looking for doesn't exist.</p>
            <Link href="/wiki">
              <Button>Back to Wiki</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Wiki Navigation Sidebar */}
      <WikiNavigation currentPath={`/wiki/${resolvedParams.slug}`} />
      
      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/wiki">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Wiki</h1>
              <p className="text-muted-foreground">
                Knowledge base and documentation
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <PermissionBadge level={permissionLevel} />
            <Button variant="outline" size="sm">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowVersionHistory(true)}>
              <History className="mr-2 h-4 w-4" />
              History
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowPermissionManager(true)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Permissions
            </Button>
            {!isEditing && canEdit && (
              <>
                <Button onClick={() => setIsEditing(true)}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </>
            )}
            {!canEdit && (
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span>Read-only</span>
              </div>
            )}
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link href="/wiki" className="hover:text-foreground">
            Wiki
          </Link>
          <span>/</span>
          <span className="text-foreground">{pageData.title}</span>
        </div>

        {/* Page Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {isEditing ? (
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-2xl font-bold border-none p-0 h-auto"
                        placeholder="Page title..."
                      />
                    ) : (
                      <CardTitle className="text-2xl">{pageData.title}</CardTitle>
                    )}
                    
                    <div className="flex items-center space-x-4 mt-3 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{pageData.author}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>Updated {pageData.updatedAt}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span>{pageData.views} views</span>
                      </div>
                      {isEditing && (
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="category" className="text-muted-foreground">Category:</Label>
                          <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="w-32 h-6 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="engineering">Engineering</SelectItem>
                              <SelectItem value="sales">Sales</SelectItem>
                              <SelectItem value="marketing">Marketing</SelectItem>
                              <SelectItem value="hr">HR</SelectItem>
                              <SelectItem value="product">Product</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <div className="flex items-center space-x-2">
                      <Button onClick={handleSave} size="sm" disabled={isSaving}>
                        {isSaving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button onClick={handleCancel} variant="outline" size="sm" disabled={isSaving}>
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <RichTextEditor
                    content={content}
                    onChange={setContent}
                    placeholder="Start writing your page content..."
                  />
                ) : (
                  <EmbedContentRenderer content={content} pageId={pageData?.id} />
                )}
              </CardContent>
            </Card>

            {/* Comments Section - Empty for now */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Comments</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No comments yet</p>
                  <p className="text-sm">Be the first to comment on this page!</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <Tag className="h-5 w-5" />
                  <span>Tags</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {pageData.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Related Pages */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Related Pages</CardTitle>
              </CardHeader>
              <CardContent>
                {relatedPages.length > 0 ? (
                  <div className="space-y-3">
                    {relatedPages.map((page) => (
                      <Link key={page.id} href={`/wiki/${page.slug}`} className="block hover:bg-muted p-2 rounded">
                        <div className="font-medium">{page.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {stripHtml(page.excerpt || page.content || '')}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No related pages found</p>
                    <p className="text-xs">Pages with similar tags will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Page Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Page Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{formatDate(pageData.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last updated</span>
                    <span>{formatDate(pageData.updatedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Views</span>
                    <span>{pageData.views || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Author</span>
                    <span>{pageData.createdBy?.name || 'Unknown'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Permission Manager Modal */}
      {showPermissionManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <PermissionManager
            pageId={pageData?.id || ''}
            currentLevel={permissionLevel}
            onLevelChange={handlePermissionChange}
            onClose={() => setShowPermissionManager(false)}
          />
        </div>
      )}

      {showVersionHistory && (
        <VersionHistory
          pageId={pageData?.id || ''}
          onClose={() => setShowVersionHistory(false)}
          onRestore={handleVersionRestore}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete Page
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300">
                Are you sure you want to delete <strong>"{pageData?.title}"</strong>? 
                This will permanently remove the page and all its content.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Page
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}