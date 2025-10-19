// Enhanced Wiki Layout Component
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/wiki/rich-text-editor"
import { 
  Search, 
  Plus, 
  Home,
  BookOpen,
  FileText,
  ChevronLeft,
  ChevronRight,
  Upload,
  Users,
  Archive,
  Grid3X3,
  Share2,
  Bell,
  Circle,
  Layers,
  Lightbulb,
  Brain,
  Star,
  Clock,
  Eye,
  Save,
  X,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Folder
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface WikiLayoutProps {
  children: React.ReactNode
  currentPage?: {
    id: string
    title: string
    slug: string
    author?: string
    updatedAt: string
    viewCount?: number
    tags?: string[]
  }
}

interface WikiWorkspace {
  id: string
  name: string
  type: 'personal' | 'team' | 'project'
  color: string
  icon: string
  pageCount: number
}

interface RecentPage {
  id: string
  title: string
  slug: string
  updatedAt: string
  author: string
}

export function WikiLayout({ children, currentPage }: WikiLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [workspaces, setWorkspaces] = useState<WikiWorkspace[]>([])
  const [recentPages, setRecentPages] = useState<RecentPage[]>([])
  const [favoritePages, setFavoritePages] = useState<RecentPage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingPage, setIsCreatingPage] = useState(false)
  const [newPageTitle, setNewPageTitle] = useState("")
  const [newPageContent, setNewPageContent] = useState("")
  const [newPageCategory, setNewPageCategory] = useState("general")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pathname = usePathname()

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  const handleCreatePage = () => {
    setIsCreatingPage(true)
    setNewPageTitle("")
    setNewPageContent("")
    setNewPageCategory("general")
    setError(null)
  }

  const handleCancelCreate = () => {
    setIsCreatingPage(false)
    setNewPageTitle("")
    setNewPageContent("")
    setNewPageCategory("general")
    setError(null)
  }

  const toggleFavorite = async (page: RecentPage) => {
    try {
      const isCurrentlyFavorite = favoritePages.some(fav => fav.id === page.id)
      
      if (isCurrentlyFavorite) {
        // Remove from favorites
        await fetch(`/api/wiki/pages/${page.id}/favorite`, {
          method: 'DELETE'
        })
        setFavoritePages(prev => prev.filter(fav => fav.id !== page.id))
      } else {
        // Add to favorites
        await fetch(`/api/wiki/pages/${page.id}/favorite`, {
          method: 'POST'
        })
        // Refresh favorites list from server
        const response = await fetch('/api/wiki/favorites')
        if (response.ok) {
          const favoritesData = await response.json()
          setFavoritePages(favoritesData)
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const handleSavePage = async () => {
    if (!newPageTitle.trim() || !newPageContent.trim()) {
      setError("Please enter both title and content")
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      const response = await fetch('/api/wiki/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId: 'cmgl0f0wa00038otlodbw5jhn',
          title: newPageTitle.trim(),
          content: newPageContent.trim(),
          tags: [],
          category: newPageCategory
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create page')
      }

      const newPage = await response.json()
      setIsCreatingPage(false)
      setNewPageTitle("")
      setNewPageContent("")
      setNewPageCategory("general")
      
      // Refresh recent pages
      const recentResponse = await fetch('/api/wiki/recent-pages')
      if (recentResponse.ok) {
        const recentData = await recentResponse.json()
        setRecentPages(recentData)
      }
      
      // Navigate to the new page
      window.location.href = `/wiki/${newPage.slug}`
    } catch (error) {
      console.error('Error creating page:', error)
      setError(error instanceof Error ? error.message : 'Failed to create page. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Load workspaces and recent pages
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load workspaces
        const workspacesResponse = await fetch('/api/wiki/workspaces')
        if (workspacesResponse.ok) {
          const workspacesData = await workspacesResponse.json()
          setWorkspaces(workspacesData)
        }

        // Load recent pages
        const recentResponse = await fetch('/api/wiki/recent-pages')
        if (recentResponse.ok) {
          const recentData = await recentResponse.json()
          setRecentPages(recentData)
        }

        // Load favorite pages
        const favoritesResponse = await fetch('/api/wiki/favorites')
        if (favoritesResponse.ok) {
          const favoritesData = await favoritesResponse.json()
          setFavoritePages(favoritesData)
        }
      } catch (error) {
        console.error('Error loading wiki data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Reset creation state when navigating to existing pages
  useEffect(() => {
    if (pathname && !pathname.includes('/wiki/new') && pathname !== '/wiki') {
      setIsCreatingPage(false)
    }
  }, [pathname])

  // Listen for favorites changes
  useEffect(() => {
    const handleFavoritesChanged = async () => {
      try {
        const response = await fetch('/api/wiki/favorites')
        if (response.ok) {
          const favoritesData = await response.json()
          setFavoritePages(favoritesData)
        }
      } catch (error) {
        console.error('Error refreshing favorites:', error)
      }
    }

    window.addEventListener('favoritesChanged', handleFavoritesChanged)
    
    return () => {
      window.removeEventListener('favoritesChanged', handleFavoritesChanged)
    }
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <>
      <style jsx>{`
        .sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }
        
        .sidebar-scroll:hover {
          scrollbar-color: #d1d5db transparent;
        }
        
        .sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }
        
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 3px;
        }
        
        .sidebar-scroll:hover::-webkit-scrollbar-thumb {
          background: #d1d5db;
        }
        
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
      <div className="h-screen bg-background flex">
      {/* Left Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-72'} bg-card transition-all duration-300 flex flex-col border-r border-border shadow-sm h-screen overflow-hidden`}>
        {/* Top Section - Search and AI Button */}
        <div className="p-4 border-b border-border">
          {!sidebarCollapsed && (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Explore knowledge..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted border-border text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              {/* AI Assistant Button */}
              <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white mb-3">
                <Brain className="h-4 w-4 mr-2" />
                Ask Lumi AI
              </Button>

              {/* Create New Page Button */}
              <Button 
                variant="outline" 
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 mb-4"
                onClick={handleCreatePage}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Page
              </Button>
            </>
          )}
        </div>

        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto sidebar-scroll">
          <div className="p-4">
            {!sidebarCollapsed && (
              <>

                {/* Knowledge Base */}
                <Link
                  href="/wiki/knowledge-base"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-6 transition-colors ${
                    pathname.startsWith('/wiki/knowledge-base') 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="font-medium">Knowledge Base</span>
                </Link>

                {/* Workspaces Section */}
                <div className="mb-4">
                  <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">WORKSPACES</h3>
                  
                  {isLoading ? (
                    <div className="space-y-2">
                      <div className="h-8 bg-gray-100 rounded animate-pulse"></div>
                      <div className="h-8 bg-gray-100 rounded animate-pulse"></div>
                    </div>
                  ) : (
                    <>
                      {workspaces.map((workspace) => (
                        <Link
                          key={workspace.id}
                          href={`/wiki/workspace/${workspace.id}`}
                          className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg mb-2"
                        >
                          <Circle className="h-2 w-2" style={{ color: workspace.color }} />
                          <div 
                            className="w-4 h-4 rounded-md flex items-center justify-center"
                            style={{ backgroundColor: workspace.color + '20' }}
                          >
                            <FileText className="h-2 w-2" style={{ color: workspace.color }} />
                          </div>
                          <span className="text-sm">{workspace.name}</span>
                          <span className="text-xs text-gray-400 ml-auto">({workspace.pageCount})</span>
                        </Link>
                      ))}
                      
                      {/* Create Workspace Button */}
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Workspace
                      </Button>
                    </>
                  )}
                </div>

                {/* Recent Pages */}
                {recentPages.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">RECENT PAGES</h3>
                    
                    <div className="space-y-1">
                      {recentPages.slice(0, 5).map((page) => (
                        <Link
                          key={page.id}
                          href={`/wiki/${page.slug}`}
                          className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                        >
                          <FileText className="h-3 w-3 text-gray-500" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{page.title}</div>
                            <div className="text-xs text-gray-500">{formatDate(page.updatedAt)}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Favorites */}
                <div className="mb-4">
                  <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">FAVORITES</h3>
                  
                  {favoritePages.length > 0 ? (
                    <div className="space-y-1">
                      {favoritePages.map((page) => (
                        <Link
                          key={page.id}
                          href={`/wiki/${page.slug}`}
                          className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg group"
                        >
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{page.title}</div>
                            <div className="text-xs text-gray-500">{formatDate(page.updatedAt)}</div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              toggleFavorite(page)
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded"
                          >
                            <X className="h-3 w-3 text-gray-400" />
                          </button>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No favorites yet</p>
                  )}
                </div>
              </>
            )}

            {/* Bottom Navigation */}
            <div className="space-y-1">
              {!sidebarCollapsed && (
                <>
                  <Link
                    href="/wiki/ai-insights"
                    className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                  >
                    <Lightbulb className="h-4 w-4" />
                    <span className="text-sm">AI Insights</span>
                  </Link>
                  <Link
                    href="/wiki/team"
                    className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                  >
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Team Members</span>
                  </Link>
                  <Link
                    href="/wiki/import"
                    className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">Import Data</span>
                  </Link>
                  <Link
                    href="/wiki/templates"
                    className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                  >
                    <Grid3X3 className="h-4 w-4" />
                    <span className="text-sm">Templates</span>
                  </Link>
                  <Link
                    href="/wiki/shared"
                    className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="text-sm">Shared Content</span>
                  </Link>
                  <Link
                    href="/wiki/archive"
                    className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                  >
                    <Archive className="h-4 w-4" />
                    <span className="text-sm">Archive</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Toggle */}
        <div className="p-4 border-t border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="w-full text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-background overflow-y-auto h-screen">
        {isCreatingPage ? (
          /* Minimalistic Page Editor */
          <div className="h-full bg-background min-h-screen">
            {/* Main Editor Area - Clean Document */}
            <div className="flex-1 p-8 bg-background min-h-screen">
              <div className="max-w-4xl mx-auto">
                {/* Page Info and Actions */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600 p-2 h-auto">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600 p-2 h-auto">
                      <Star className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600 p-2 h-auto">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600 p-2 h-auto">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600 p-2 h-auto">
                      <Brain className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600 p-2 h-auto">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-gray-500">
                    New document
                  </div>
                </div>

                {/* Title Input - Like Slite */}
                <div className="mb-8">
                  <Input
                    value={newPageTitle}
                    onChange={(e) => setNewPageTitle(e.target.value)}
                    className="text-4xl font-bold border-none p-0 h-auto focus:ring-0 focus:outline-none focus:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder-gray-400 bg-transparent"
                    placeholder="Give your doc a title"
                  />
                </div>

                {/* Content Editor - No Border */}
                <div className="min-h-[400px]">
                  <RichTextEditor
                    content={newPageContent}
                    onChange={setNewPageContent}
                    placeholder="Click here to start writing"
                    className="min-h-[400px] border-none shadow-none bg-transparent focus:ring-0 focus:outline-none"
                    showToolbar={false}
                  />
                </div>

                {/* Action Suggestions - Only show when editing */}
                <div className="flex items-center gap-6 text-sm text-gray-500 mt-8">
                  <button className="flex items-center gap-2 hover:text-gray-700">
                    <Grid3X3 className="h-4 w-4" />
                    <span>Use a template</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-gray-700">
                    <Upload className="h-4 w-4" />
                    <span>Import</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-gray-700">
                    <Plus className="h-4 w-4" />
                    <span>New subdoc</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-gray-700">
                    <Folder className="h-4 w-4" />
                    <span>Convert to collection</span>
                  </button>
                </div>

                {/* Auto-save indicator */}
                {(newPageTitle.trim() || newPageContent.trim()) && (
                  <div className="fixed bottom-6 right-6">
                    <Button 
                      onClick={handleSavePage} 
                      disabled={isSaving}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Regular Page Content */
          <div className="flex-1">
            {children}
          </div>
        )}
      </div>
    </div>
    </>
  )
}
