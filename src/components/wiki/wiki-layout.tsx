// Enhanced Wiki Layout Component
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RichTextEditor } from "@/components/wiki/rich-text-editor"
import { WikiAIAssistant } from "@/components/wiki/wiki-ai-assistant"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { 
  Search, 
  Plus, 
  Home,
  BookOpen,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
  Folder,
  Trash2,
  Globe,
  Target
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

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
  workspaceId?: string
}

interface WikiWorkspace {
  id: string
  name: string
  description?: string
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
  permissionLevel?: string
  workspace_type?: string
}

interface Project {
  id: string
  name: string
  description?: string
  status: string
  color?: string
}

export function WikiLayout({ children, currentPage, workspaceId: propWorkspaceId }: WikiLayoutProps) {
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [workspaceId, setWorkspaceId] = useState<string>(propWorkspaceId || '')
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false)
  const [aiDisplayMode, setAiDisplayMode] = useState<'sidebar' | 'floating'>('sidebar')
  const [workspaces, setWorkspaces] = useState<WikiWorkspace[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [recentPages, setRecentPages] = useState<RecentPage[]>([])
  const [favoritePages, setFavoritePages] = useState<RecentPage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingPage, setIsCreatingPage] = useState(false)
  const [newPageTitle, setNewPageTitle] = useState("")
  const [newPageContent, setNewPageContent] = useState("")
  const [newPageCategory, setNewPageCategory] = useState("general")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPersonalPage, setIsPersonalPage] = useState(false)
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Record<string, boolean>>({})
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('')
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false)
  const [showWorkspaceSelectDialog, setShowWorkspaceSelectDialog] = useState(false)
  const [selectedWorkspaceForPage, setSelectedWorkspaceForPage] = useState<string | null>(null)
  const pathname = usePathname() || ''

  const toggleWorkspace = (workspaceId: string) => {
    setExpandedWorkspaces(prev => ({
      ...prev,
      [workspaceId]: !prev[workspaceId]
    }))
  }

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      setError('Workspace name is required')
      return
    }

    try {
      setIsSavingWorkspace(true)
      setError(null)

      const response = await fetch('/api/wiki/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newWorkspaceName.trim(),
          description: newWorkspaceDescription.trim(),
          type: 'team'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create workspace')
      }

      const newWorkspace = await response.json()
      
      // Close dialog and reset form
      setIsCreatingWorkspace(false)
      setNewWorkspaceName('')
      setNewWorkspaceDescription('')

      // Refresh workspaces list
      const workspacesResponse = await fetch('/api/wiki/workspaces')
      if (workspacesResponse.ok) {
        const workspacesData = await workspacesResponse.json()
        setWorkspaces(workspacesData)
      }

      // Add to expanded state
      setExpandedWorkspaces(prev => ({
        ...prev,
        [newWorkspace.id]: false
      }))

      // Redirect to the new workspace
      router.push(`/wiki/workspace/${newWorkspace.id}`)
    } catch (error) {
      console.error('Error creating workspace:', error)
      setError(error instanceof Error ? error.message : 'Failed to create workspace')
    } finally {
      setIsSavingWorkspace(false)
    }
  }

  const handleDeleteWorkspace = async (workspaceIdToDelete: string, workspaceName: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Prevent deletion of default workspaces (Personal Space and Team Workspace)
    if (workspaceIdToDelete.startsWith('personal-space-') || workspaceIdToDelete.startsWith('team-workspace-')) {
      alert('Default workspaces (Personal Space and Team Workspace) cannot be deleted')
      return
    }
    
    if (!confirm(`Are you sure you want to delete the workspace "${workspaceName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/wiki/workspaces?id=${workspaceIdToDelete}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete workspace')
      }

      // Refresh workspaces list
      const workspacesResponse = await fetch('/api/wiki/workspaces')
      if (workspacesResponse.ok) {
        const workspacesData = await workspacesResponse.json()
        setWorkspaces(workspacesData)
      }

      // Redirect to Team Workspace if we deleted the current workspace
      if (pathname.includes(`/wiki/workspace/${workspaceIdToDelete}`)) {
        router.push('/wiki/team-workspace')
      }
    } catch (error) {
      console.error('Error deleting workspace:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete workspace. Please try again.')
    }
  }

  const handleDeletePage = async (pageId: string, e: React.MouseEvent, workspaceType?: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this page?')) {
      return
    }

    try {
      const response = await fetch(`/api/wiki/pages/${pageId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete page')
      }

      // Dispatch event to refresh pages
      window.dispatchEvent(new CustomEvent('pageDeleted'))

      // Refresh recent pages
      const recentResponse = await fetch('/api/wiki/recent-pages')
      if (recentResponse.ok) {
        const recentData = await recentResponse.json()
        setRecentPages(recentData)
      }

      // Redirect to the appropriate workspace
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
      alert('Failed to delete page. Please try again.')
    }
  }

  // Check if we're on personal space page
  useEffect(() => {
    const isPersonal = pathname.includes('/wiki/personal-space')
    setIsPersonalPage(isPersonal)
  }, [pathname])

  const handleWorkspaceSelected = useCallback((workspaceId: string) => {
    setSelectedWorkspaceForPage(workspaceId)
    setShowWorkspaceSelectDialog(false)
    
    // Now open the page creation dialog
    setIsCreatingPage(true)
    setNewPageTitle("")
    setNewPageContent("")
    setNewPageCategory("general")
    setError(null)
  }, [])

  // Memoize handleCreatePage to prevent unnecessary re-creations
  const memoizedHandleCreatePage = useCallback(() => {
    setShowWorkspaceSelectDialog(true)
  }, [])

  // Function to create page with a specific workspace
  const createPageWithWorkspace = useCallback((workspaceId: string) => {
    handleWorkspaceSelected(workspaceId)
  }, [handleWorkspaceSelected])

  // Expose global trigger functions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).triggerCreatePage = () => {
        setShowWorkspaceSelectDialog(true)
      }
      (window as any).triggerCreatePageWithWorkspace = createPageWithWorkspace
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).triggerCreatePage
        delete (window as any).triggerCreatePageWithWorkspace
      }
    }
  }, [createPageWithWorkspace])

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  const handleCreatePage = useCallback(() => {
    // Show workspace selection dialog for sidebar button
    setShowWorkspaceSelectDialog(true)
  }, [])

  const handleCancelCreate = () => {
    setIsCreatingPage(false)
    setNewPageTitle("")
    setNewPageContent("")
    setNewPageCategory("general")
    setSelectedWorkspaceForPage(null)
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
    console.log('Save button clicked!', { newPageTitle, hasContent: !!newPageContent.trim(), workspaceId })
    
    // Allow saving with just a title, don't require content
    if (!newPageTitle.trim()) {
      setError("Please enter a title")
      return
    }

    if (!workspaceId) {
      console.error('Workspace ID is missing!')
      setError("Workspace not found")
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      
      // Ensure we have at least a space for content since API requires it
      const content = newPageContent.trim() || ' '
      
      // Determine workspace_type based on selected workspace
      let workspaceType = 'team'
      if (selectedWorkspaceForPage) {
        // Handle special cases like 'personal-space' string
        if (selectedWorkspaceForPage === 'personal-space') {
          // Find the personal workspace by type
          const personalWorkspace = workspaces.find(w => w.type === 'personal' || w.id?.startsWith('personal-space-'))
          if (personalWorkspace) {
            workspaceType = 'personal'
            console.log('✅ Setting workspace_type to personal (from personal-space string)')
          }
        } else {
          const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceForPage)
          console.log('🔍 Selected workspace:', selectedWorkspace)
          
          if (selectedWorkspace?.type === 'personal') {
            workspaceType = 'personal'
          } else if (selectedWorkspace?.type === 'team') {
            workspaceType = 'team'
          } else if (selectedWorkspace?.id) {
            // For custom workspaces, use the workspace ID
            workspaceType = selectedWorkspace.id
            console.log('✅ Setting workspace_type to custom workspace ID:', workspaceType)
          }
        }
      }
      
      console.log('💾 Saving page with title:', newPageTitle, 'content length:', content.length, 'workspaceId:', workspaceId, 'workspaceType:', workspaceType)
      
      const response = await fetch('/api/wiki/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newPageTitle.trim(),
          content: content,
          tags: [],
          category: newPageCategory,
          permissionLevel: isPersonalPage ? 'personal' : 'team',
          workspace_type: workspaceType
        })
      })

      console.log('Response status:', response.status, response.ok)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.log('Error data:', errorData)
        throw new Error(errorData.error || 'Failed to create page')
      }

      const newPage = await response.json()
      console.log('✅ Page created successfully:', newPage)
      console.log('📌 Page workspace_type:', newPage.workspace_type)
      
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
      
      // Dispatch event to refresh workspace pages
      window.dispatchEvent(new CustomEvent('workspacePagesRefreshed'))
      
      // Navigate to the new page using router (no full page reload)
      router.push(`/wiki/${newPage.slug}`)
    } catch (error) {
      console.error('Error creating page:', error)
      setError(error instanceof Error ? error.message : 'Failed to create page. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Fetch workspace ID from user status
  useEffect(() => {
    const fetchWorkspaceId = async () => {
      if (workspaceId) return // Already have workspaceId from prop
      
      try {
        const response = await fetch('/api/auth/user-status')
        if (response.ok) {
          const userStatus = await response.json()
          if (userStatus.workspaceId) {
            console.log('Fetched workspaceId:', userStatus.workspaceId)
            setWorkspaceId(userStatus.workspaceId)
          }
        }
      } catch (error) {
        console.error('Error fetching workspace ID:', error)
      }
    }
    
    fetchWorkspaceId()
  }, [workspaceId])

  // Load workspaces and recent pages
  useEffect(() => {
    if (!workspaceId) return // Don't load until we have workspaceId
    
    const loadData = async () => {
      try {
        // Load workspaces
        const workspacesResponse = await fetch('/api/wiki/workspaces')
        if (workspacesResponse.ok) {
          const workspacesData = await workspacesResponse.json()
          
          // Ensure workspacesData is an array with valid data
          if (!Array.isArray(workspacesData)) {
            console.error('❌ Workspaces response is not an array:', workspacesData)
            setWorkspaces([])
          } else {
            // Filter out empty objects and validate data
            const validWorkspaces = workspacesData.filter((w: any) => w && (w.id || w.name))
            
            if (validWorkspaces.length === 0 && workspacesData.length > 0) {
              console.error('❌ All workspaces are empty objects:', workspacesData)
            }
            
            // Normalize workspace names on the frontend
            const normalizedWorkspaces = validWorkspaces.map((w: any) => {
              // Check if this is a default Personal Space
              if (w.id?.startsWith('personal-space-')) {
                return { ...w, name: 'Personal Space' }
              }
              // Check if this is a default Team Workspace
              if (w.id?.startsWith('team-workspace-')) {
                return { ...w, name: 'Team Workspace' }
              }
              // For custom workspaces, keep their original names
              return w
            })
            
            console.log('✨ Normalized workspaces:', normalizedWorkspaces.map((w: any) => ({ id: w.id, name: w.name, type: w.type })))
            
            setWorkspaces(normalizedWorkspaces)
          }
        } else {
          console.error('❌ Failed to fetch workspaces:', workspacesResponse.status, workspacesResponse.statusText)
        }

        // Load all data in parallel for better performance
        const [recentResponse, favoritesResponse, projectsResponse] = await Promise.all([
          fetch('/api/wiki/recent-pages?limit=50'),
          fetch('/api/wiki/favorites'),
          fetch(`/api/projects?workspaceId=${workspaceId}`)
        ])

        // Process responses
        if (recentResponse.ok) {
          const recentData = await recentResponse.json()
          console.log('📄 All recent pages loaded:', recentData.map((p: any) => ({ 
            title: p.title, 
            workspace_type: p.workspace_type, 
            permissionLevel: p.permissionLevel 
          })))
          setRecentPages(recentData)
        }

        if (favoritesResponse.ok) {
          const favoritesData = await favoritesResponse.json()
          setFavoritePages(favoritesData)
        }

        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json()
          setProjects(projectsData)
        }
      } catch (error) {
        console.error('Error loading wiki data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [workspaceId])

  // Reset creation state when navigating to existing pages
  useEffect(() => {
    if (pathname && !pathname.includes('/wiki/new') && pathname !== '/wiki') {
      setIsCreatingPage(false)
    }
  }, [pathname])

  // Listen for favorites changes - memoize callbacks
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

    const handlePageDeleted = async () => {
      // Refresh recent pages when a page is deleted
      const recentResponse = await fetch('/api/wiki/recent-pages')
      if (recentResponse.ok) {
        const recentData = await recentResponse.json()
        setRecentPages(recentData)
      }
    }

    window.addEventListener('favoritesChanged', handleFavoritesChanged)
    window.addEventListener('pageDeleted', handlePageDeleted)
    
    return () => {
      window.removeEventListener('favoritesChanged', handleFavoritesChanged)
      window.removeEventListener('pageDeleted', handlePageDeleted)
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
                    (pathname || '').startsWith('/wiki/knowledge-base') 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="font-medium">Knowledge Base</span>
                </Link>

                {/* Home Section */}
                <div className="mb-4">
                  <Link
                    href="/wiki/home"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-4 transition-colors ${
                      (pathname || '') === '/wiki/home' || (pathname || '') === '/wiki' || (pathname || '') === '/spaces'
                        ? 'bg-indigo-50 text-indigo-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Home className="h-4 w-4" />
                    <span className="font-medium">Home</span>
                  </Link>
                </div>

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
                      {workspaces
                        .sort((a, b) => {
                          // Sort: Personal Space first, Team Workspace second, then custom workspaces alphabetically
                          if (a.type === 'personal') return -1
                          if (b.type === 'personal') return 1
                          if (a.type === 'team') return -1
                          if (b.type === 'team') return 1
                          return a.name.localeCompare(b.name)
                        })
                        .map((workspace) => {
                        // Map workspace types to their actual routes
                        const workspaceRoute = workspace.type === 'personal' 
                          ? '/wiki/personal-space'
                          : workspace.type === 'team'
                          ? '/wiki/team-workspace'
                          : `/wiki/workspace/${workspace.id}`
                        
                        // Determine if this is a custom workspace
                        const isCustomWorkspace = workspace.type !== 'personal' && workspace.type !== 'team'
                        
                        const isPersonalSpace = workspace.type === 'personal'
                        const isTeamWorkspace = workspace.type === 'team'
                        const personalPages = recentPages.filter(p => p.permissionLevel === 'personal')
                        const teamPages = recentPages.filter(p => p.permissionLevel !== 'personal')
                        
                        // Filter pages by workspace_type - STRICT filtering to ensure pages only show in their correct workspace
                        let workspacePages: typeof recentPages = []
                        if (isPersonalSpace) {
                          // Personal Space: Show pages explicitly marked as 'personal' OR legacy pages with permissionLevel='personal'
                          workspacePages = recentPages.filter(p => {
                            const pageWorkspaceType = (p as any).workspace_type
                            const pagePermissionLevel = p.permissionLevel
                            
                            // Primary match: workspace_type is explicitly 'personal'
                            if (pageWorkspaceType === 'personal') {
                              return true
                            }
                            
                            // Legacy match: If workspace_type is null/undefined, check permissionLevel
                            // This handles old pages created before workspace_type was implemented
                            if (!pageWorkspaceType || pageWorkspaceType === null || pageWorkspaceType === undefined || pageWorkspaceType === '') {
                              return pagePermissionLevel === 'personal'
                            }
                            
                            // If workspace_type is explicitly set to something else (team or custom), don't include
                            return false
                          })
                        } else if (isTeamWorkspace) {
                          // Team Workspace: Show pages marked as 'team' OR unset/null, BUT exclude personal pages
                          workspacePages = recentPages.filter(p => {
                            const pageWorkspaceType = (p as any).workspace_type
                            const pagePermissionLevel = p.permissionLevel
                            
                            // Exclude personal pages explicitly - highest priority
                            if (pageWorkspaceType === 'personal') {
                              return false
                            }
                            
                            // Exclude if permissionLevel is 'personal' (unless workspace_type is explicitly 'team')
                            if (pagePermissionLevel === 'personal' && pageWorkspaceType !== 'team') {
                              return false
                            }
                            
                            // Include if workspace_type is 'team'
                            if (pageWorkspaceType === 'team') {
                              return true
                            }
                            
                            // Include legacy pages (null/undefined workspace_type) if not personal
                            if (!pageWorkspaceType || pageWorkspaceType === null || pageWorkspaceType === undefined || pageWorkspaceType === '') {
                              return pagePermissionLevel !== 'personal'
                            }
                            
                            // Don't include custom workspace pages here (they show in their own workspace)
                            return false
                          })
                        } else if (isCustomWorkspace) {
                          // Custom Workspace: ONLY show pages with workspace_type matching this workspace ID
                          workspacePages = recentPages.filter(p => {
                            const pageWorkspaceType = (p as any).workspace_type
                            return pageWorkspaceType === workspace.id
                          })
                        }
                        
                        const isExpanded = expandedWorkspaces[workspace.id] || false
                        const hasPages = workspacePages.length > 0
                        const showDeleteButton = !isPersonalSpace && !isTeamWorkspace
                        
                        if (showDeleteButton) {
                          console.log('🗑️ Show delete button for:', workspace.name, workspace.id)
                        }
                        
                        return (
                          <div key={workspace.id} className="group relative mb-2">
                            <div className="relative flex items-center px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg">
                              <Link
                                href={workspaceRoute}
                                className="flex items-center gap-3 flex-1"
                              >
                              <Circle className="h-2 w-2" style={{ color: workspace.color }} />
                              <div 
                                className="w-4 h-4 rounded-md flex items-center justify-center"
                                style={{ backgroundColor: workspace.color + '20' }}
                              >
                                <FileText className="h-2 w-2" style={{ color: workspace.color }} />
                              </div>
                                <span className="text-sm flex-1">{workspace.name}</span>
                                <span className="text-xs text-gray-400">({workspacePages.length})</span>
                              </Link>
                              <div className="flex items-center gap-1 ml-auto">
                                {hasPages && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      toggleWorkspace(workspace.id)
                                    }}
                                    className="p-0.5 hover:bg-gray-200 rounded"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-3 w-3 text-gray-500" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3 text-gray-500" />
                                    )}
                                  </button>
                                )}
                                {showDeleteButton && (
                                  <button
                                    onClick={(e) => handleDeleteWorkspace(workspace.id, workspace.name, e)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                                    title="Delete workspace"
                                  >
                                    <Trash2 className="h-3 w-3 text-red-600" />
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            {/* Show personal pages nested under Personal Space */}
                            {isPersonalSpace && isExpanded && (
                              <div className="ml-6 mt-1 space-y-1 mb-2">
                                {workspacePages.slice(0, 5).map((page) => (
                                  <div
                                    key={page.id}
                                    className="group flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                                  >
                                    <Link href={`/wiki/${page.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
                                      <FileText className="h-3 w-3 text-indigo-600" />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm truncate">{page.title}</div>
                                        <div className="text-xs text-gray-500">{formatDate(page.updatedAt)}</div>
                                      </div>
                                    </Link>
                                    <button
                                      onClick={(e) => handleDeletePage(page.id, e, page.permissionLevel)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                                      title="Delete page"
                                    >
                                      <Trash2 className="h-3 w-3 text-red-600" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Show team pages nested under Team Workspace */}
                            {isTeamWorkspace && isExpanded && (
                              <div className="ml-6 mt-1 space-y-1 mb-2">
                                {workspacePages.slice(0, 5).map((page) => (
                                  <div
                                    key={page.id}
                                    className="group flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                                  >
                                    <Link href={`/wiki/${page.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
                                      <FileText className="h-3 w-3 text-gray-500" />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm truncate">{page.title}</div>
                                        <div className="text-xs text-gray-500">{formatDate(page.updatedAt)}</div>
                                      </div>
                                    </Link>
                                    <button
                                      onClick={(e) => handleDeletePage(page.id, e, page.permissionLevel)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                                      title="Delete page"
                                    >
                                      <Trash2 className="h-3 w-3 text-red-600" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Show pages nested under Custom Workspace */}
                            {isCustomWorkspace && isExpanded && (
                              <div className="ml-6 mt-1 space-y-1 mb-2">
                                {workspacePages.slice(0, 5).map((page) => (
                                  <div
                                    key={page.id}
                                    className="group flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                                  >
                                    <Link href={`/wiki/${page.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
                                      <FileText className="h-3 w-3 text-gray-500" />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm truncate">{page.title}</div>
                                        <div className="text-xs text-gray-500">{formatDate(page.updatedAt)}</div>
                                      </div>
                                    </Link>
                                    <button
                                      onClick={(e) => handleDeletePage(page.id, e, page.permissionLevel)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                                      title="Delete page"
                                    >
                                      <Trash2 className="h-3 w-3 text-red-600" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      
                      {/* Create Workspace Button */}
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsCreatingWorkspace(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Workspace
                      </Button>
                    </>
                  )}
                </div>

                {/* Projects Section */}
                <div className="mb-4">
                  <Link href="/projects">
                    <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3 hover:text-gray-700 cursor-pointer">PROJECTS</h3>
                  </Link>
                  
                  {projects.length > 0 ? (
                    <div className="space-y-1">
                      {projects.map((project) => (
                        <Link
                          key={project.id}
                          href={`/projects/${project.id}`}
                          className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg group"
                        >
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: project.color || '#3B82F6' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{project.name}</div>
                          </div>
                        </Link>
                      ))}
                      
                      {/* New Project Button */}
                      <Link
                        href="/projects/new"
                        className="flex items-center gap-3 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="text-sm">New Project</span>
                      </Link>
                    </div>
                  ) : (
                    <Link
                      href="/projects/new"
                      className="flex items-center gap-3 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-sm">New Project</span>
                    </Link>
                  )}
                </div>

                {/* Recent Pages - Filter out personal pages */}
                {recentPages.filter(p => p.permissionLevel !== 'personal').length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">RECENT PAGES</h3>
                    
                    <div className="space-y-1">
                      {recentPages
                        .filter(p => p.permissionLevel !== 'personal')
                        .slice(0, 5)
                        .map((page) => (
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
      <div className={cn(
        "flex-1 bg-background overflow-y-auto h-screen transition-all duration-500",
        isAISidebarOpen && aiDisplayMode === 'sidebar' ? "mr-[384px]" : ""
      )}>
        {isCreatingPage ? (
          /* Minimalistic Page Editor */
          <div className="h-full bg-background min-h-screen">
            {/* Main Editor Area - Clean Document */}
            <div className="flex-1 p-8 bg-background min-h-screen">
              <div className="max-w-4xl mx-auto">
                {/* Page Info and Actions */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <Button 
                      onClick={handleSavePage} 
                      disabled={isSaving || !newPageTitle.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
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

                {/* Error Display */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                    {error}
                  </div>
                )}

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

              </div>
            </div>

            {/* AI Assistant */}
            <WikiAIAssistant 
              currentTitle={newPageTitle}
              currentContent={newPageContent}
              onContentUpdate={setNewPageContent}
              onOpenChange={setIsAISidebarOpen}
              onDisplayModeChange={setAiDisplayMode}
            />
          </div>
        ) : (
          /* Regular Page Content */
          <div className="flex-1">
            {children}
          </div>
        )}
      </div>
    </div>

    {/* Workspace Selection Dialog for New Page */}
    <Dialog open={showWorkspaceSelectDialog} onOpenChange={setShowWorkspaceSelectDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Workspace</DialogTitle>
          <DialogDescription>
            Choose which workspace this page should be created in
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Input
            placeholder="Search workspaces..."
            className="mb-4"
            onChange={(e) => {
              const searchValue = e.target.value.toLowerCase()
              // We could add search filtering here if needed
            }}
          />
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {workspaces.map((workspace) => {
              const getIcon = () => {
                if (workspace.type === 'personal') {
                  return <FileText className="h-5 w-5 text-indigo-600" />
                } else if (workspace.type === 'team') {
                  return <Users className="h-5 w-5 text-blue-600" />
                } else {
                  return <Globe className="h-5 w-5 text-blue-600" />
                }
              }

              return (
                <button
                  key={workspace.id}
                  onClick={() => {
                    console.log('Clicked workspace:', workspace.id)
                    handleWorkspaceSelected(workspace.id)
                  }}
                  className="w-full flex items-center gap-3 p-4 border rounded-lg hover:bg-accent hover:border-blue-300 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {getIcon()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">{workspace.name}</div>
                    {workspace.description && (
                      <div className="text-sm text-muted-foreground">{workspace.description}</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowWorkspaceSelectDialog(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Create Workspace Dialog */}
    <Dialog open={isCreatingWorkspace} onOpenChange={setIsCreatingWorkspace}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogDescription>
            Create a custom workspace to organize your wiki pages
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="workspace-name">Workspace Name</Label>
            <Input
              id="workspace-name"
              placeholder="e.g., Project Documentation"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="workspace-description">Description (Optional)</Label>
            <Textarea
              id="workspace-description"
              placeholder="Brief description of this workspace's purpose"
              value={newWorkspaceDescription}
              onChange={(e) => setNewWorkspaceDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsCreatingWorkspace(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateWorkspace} disabled={isSavingWorkspace || !newWorkspaceName.trim()}>
            {isSavingWorkspace ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Workspace'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
