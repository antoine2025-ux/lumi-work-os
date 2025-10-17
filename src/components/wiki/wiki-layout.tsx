// Enhanced Wiki Layout Component
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Eye
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
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
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
      } catch (error) {
        console.error('Error loading wiki data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-72'} bg-white transition-all duration-300 flex flex-col border-r border-gray-200 shadow-sm`}>
        {/* Top Section */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              {/* Empty space where branding was */}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <Bell className="h-4 w-4" />
            </Button>
          </div>

          {!sidebarCollapsed && (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Explore knowledge..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* AI Assistant Button */}
              <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white mb-4">
                <Brain className="h-4 w-4 mr-2" />
                Ask Lumi AI
              </Button>
            </>
          )}
        </div>

        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {!sidebarCollapsed && (
              <>
                {/* Dashboard */}
                <Link
                  href="/wiki"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-2 transition-colors ${
                    pathname === '/wiki' 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Home className="h-4 w-4" />
                  <span className="font-medium">Dashboard</span>
                </Link>

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
      <div className="flex-1 bg-gray-50">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                <h1 className="text-xl font-semibold text-gray-900">
                  {currentPage?.title || 'Knowledge Base'}
                </h1>
              </div>
            </div>
            
            {currentPage && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{currentPage.author || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatDate(currentPage.updatedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{currentPage.viewCount || 0} views</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-gray-600 hover:text-gray-900">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Star className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
