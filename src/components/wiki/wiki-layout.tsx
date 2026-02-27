// Enhanced Wiki Layout Component
"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { WikiEditorShell } from "@/components/wiki/wiki-editor-shell"
import { WikiAIAssistant } from "@/components/wiki/wiki-ai-assistant"
import { JSONContent, Editor } from '@tiptap/core'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Plus, 
  FileText,
  Upload,
  Users,
  Brain,
  Star,
  Eye,
  Save,
  X,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Folder,
  Globe,
  Grid3X3,
  Share2
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useUserStatusContext } from '@/providers/user-status-provider'
import { useWorkspace } from '@/lib/workspace-context'
import { CreateSpaceDialog } from '@/components/spaces/create-space-dialog'
import { useRecentPages } from '@/hooks/use-wiki-pages'
import { TemplateSelector } from '@/components/wiki/TemplateSelector'
import { EMPTY_TIPTAP_DOC } from '@/lib/wiki/constants'
import type { WikiTemplate } from '@/lib/wiki/templates'

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

/** Page being edited in layout (no navigation) - from create flow or in-place edit */
interface ActiveEditorPage {
  id: string
  slug: string
  title: string
  contentJson: JSONContent
  contentFormat: 'JSON'
  excerpt?: string | null
  tags: string[]
  category: string
  isPublished?: boolean
  updatedAt: string | Date
  workspace_type?: string
  permissionLevel?: string
}

interface Project {
  id: string
  name: string
  description?: string
  status: string
  color?: string
}

export function WikiLayout({ children, currentPage: _currentPage, workspaceId: propWorkspaceId }: WikiLayoutProps) {
  const router = useRouter()
  // Use centralized UserStatusContext as fallback if no prop provided
  const { workspaceId: contextWorkspaceId } = useUserStatusContext()
  const { currentWorkspace: _currentWorkspace } = useWorkspace()
  const [_searchQuery, _setSearchQuery] = useState("")
  const [workspaceId, setWorkspaceId] = useState<string>(propWorkspaceId || contextWorkspaceId || '')
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false)
  const [aiDisplayMode, setAiDisplayMode] = useState<'sidebar' | 'floating'>('sidebar')
  const [workspaces, setWorkspaces] = useState<WikiWorkspace[]>([])
  const [_projects, setProjects] = useState<Project[]>([])
  const [recentPages, setRecentPages] = useState<RecentPage[]>([])
  const [favoritePages, setFavoritePages] = useState<RecentPage[]>([])
  const [_pageCounts, setPageCounts] = useState<Record<string, number>>({})
  const [_isLoading, setIsLoading] = useState(true)
  const [isCreatingPage, setIsCreatingPage] = useState(false)
  const [newPageTitle, setNewPageTitle] = useState("")
  const [newPageCategory, setNewPageCategory] = useState("general")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPersonalPage, setIsPersonalPage] = useState(false)
  const [_expandedWorkspaces, setExpandedWorkspaces] = useState<Record<string, boolean>>({})
  const [_recentOpen, _setRecentOpen] = useState(true)
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false)
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('')
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false)
  const [showWorkspaceSelectDialog, setShowWorkspaceSelectDialog] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [selectedWorkspaceForPage, setSelectedWorkspaceForPage] = useState<string | null>(null)
  const [activeEditorPage, setActiveEditorPage] = useState<ActiveEditorPage | null>(null)
  const pathname = usePathname() || ''
  const { data: _sidebarRecentPages, isLoading: _isLoadingSidebarRecent } = useRecentPages(5)
  const editorRef = useRef<Editor | null>(null)
  const latestContentRef = useRef<JSONContent | null>(null)
  const justSavedInPlaceRef = useRef(false)

  const showLayoutEditor = isCreatingPage || activeEditorPage !== null

  const initialContent: JSONContent = {
    type: 'doc',
    content: [{ type: 'paragraph' }],
  }

  const _toggleWorkspace = (workspaceId: string) => {
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
          description: newWorkspaceDescription.trim()
          // Don't specify type - let it be created as a custom workspace (null type)
          // This ensures each workspace is independent and doesn't duplicate Team Workspace
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

  const _handleDeleteWorkspace = async (workspaceIdToDelete: string, workspaceName: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Prevent deletion of Personal Space (ONLY default workspace)
    if (workspaceIdToDelete.startsWith('personal-space-')) {
      alert('Personal Space is a default workspace and cannot be deleted')
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

      // Redirect to Personal Space if we deleted the current workspace
      if (pathname.includes(`/wiki/workspace/${workspaceIdToDelete}`)) {
        router.push('/wiki/personal-space')
      }
    } catch (error) {
      console.error('Error deleting workspace:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete workspace. Please try again.')
    }
  }

  const _handleDeletePage = async (pageId: string, e: React.MouseEvent, workspaceType?: string) => {
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

  const handleWorkspaceSelected = useCallback((wsId: string) => {
    setSelectedWorkspaceForPage(wsId)
    setShowWorkspaceSelectDialog(false)
    setIsCreatingPage(true)
    setNewPageTitle("")
    setNewPageCategory("general")
    setError(null)
  }, [])

  // Function to create page with a specific workspace - shows template selector with workspace pre-selected
  const createPageWithWorkspace = useCallback((wsId: string) => {
    setSelectedWorkspaceForPage(wsId)
    setShowWorkspaceSelectDialog(true)
  }, [])

  // Expose global trigger functions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as Window & { triggerCreatePage?: () => void; triggerCreatePageWithWorkspace?: (workspaceId: string) => void }
      win.triggerCreatePage = () => {
        setShowWorkspaceSelectDialog(true)
      }
      win.triggerCreatePageWithWorkspace = createPageWithWorkspace
    }
    return () => {
      if (typeof window !== 'undefined') {
        const win = window as Window & { triggerCreatePage?: () => void; triggerCreatePageWithWorkspace?: (workspaceId: string) => void }
        delete win.triggerCreatePage
        delete win.triggerCreatePageWithWorkspace
      }
    }
  }, [createPageWithWorkspace])

  const _handleCreatePage = useCallback(() => {
    // Show workspace selection dialog for sidebar button
    setShowWorkspaceSelectDialog(true)
  }, [])

  const handleCancelCreate = () => {
    setIsCreatingPage(false)
    setNewPageTitle("")
    setNewPageCategory("general")
    setSelectedWorkspaceForPage(null)
    setActiveEditorPage(null)
    setError(null)
  }

  const resolveWorkspaceType = useCallback((wsId: string | null) => {
    if (!wsId) return 'team'
    if (wsId === 'personal-space') return 'personal'
    if (wsId === 'team-workspace') return 'team'
    const ws = workspaces.find(w => w.id === wsId)
    if (ws?.type === 'personal') return 'personal'
    if (ws?.type === 'team') return 'team'
    if (ws?.id) return ws.id
    return 'team'
  }, [workspaces])

  const handleTemplateSelect = useCallback(async (template: WikiTemplate | null) => {
    const wsId = selectedWorkspaceForPage
    if (!wsId) {
      setError('Please select a workspace first')
      return
    }
    setShowWorkspaceSelectDialog(false)
    setError(null)

    if (!template || template.id === 'blank') {
      handleWorkspaceSelected(wsId)
      return
    }

    try {
      setIsSaving(true)
      const workspaceType = resolveWorkspaceType(wsId)
      const isPersonal = workspaceType === 'personal'
      const { createWikiPage } = await import('@/lib/wiki/create-page')
      const newPage = await createWikiPage({
        workspaceId,
        title: template.name,
        contentJson: template.content,
        tags: [],
        category: template.category,
        permissionLevel: isPersonal ? 'personal' : 'team',
        workspace_type: workspaceType,
      })
      setIsCreatingPage(false)
      setNewPageTitle(template.name)
      setNewPageCategory(template.category)
      setActiveEditorPage({
        id: newPage.id,
        slug: newPage.slug,
        title: newPage.title,
        contentJson: newPage.contentJson ?? template.content,
        contentFormat: 'JSON',
        excerpt: newPage.excerpt ?? null,
        tags: newPage.tags ?? [],
        category: newPage.category ?? template.category,
        isPublished: newPage.isPublished ?? true,
        updatedAt: newPage.updatedAt ?? new Date().toISOString(),
        workspace_type: newPage.workspace_type,
        permissionLevel: newPage.permissionLevel ?? workspaceType,
      })
      justSavedInPlaceRef.current = true
      window.history.replaceState(null, '', `/wiki/${newPage.slug}?edit=true`)
      window.dispatchEvent(new CustomEvent('workspacePagesRefreshed'))
      window.dispatchEvent(new CustomEvent('pageCreated'))
      const recentResponse = await fetch('/api/wiki/recent-pages')
      if (recentResponse.ok) {
        const recentData = await recentResponse.json()
        setRecentPages(recentData)
      }
    } catch (err) {
      console.error('Error creating page from template:', err)
      setError(err instanceof Error ? err.message : 'Failed to create page')
    } finally {
      setIsSaving(false)
    }
  }, [selectedWorkspaceForPage, workspaceId, resolveWorkspaceType, handleWorkspaceSelected])

  const handleCloseLayoutEditor = () => {
    const slug = activeEditorPage?.slug
    setActiveEditorPage(null)
    setNewPageTitle("")
    setError(null)
    if (slug) {
      router.replace(`/wiki/${slug}`)
    }
  }

  const handleEditPageSave = useCallback(async (contentJson: JSONContent) => {
    if (!activeEditorPage) return
    try {
      setIsSaving(true)
      setError(null)
      const response = await fetch(`/api/wiki/pages/${activeEditorPage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPageTitle.trim(),
          contentJson,
          contentFormat: 'JSON',
          excerpt: activeEditorPage.excerpt,
          tags: activeEditorPage.tags,
          category: activeEditorPage.category,
          isPublished: activeEditorPage.isPublished ?? true,
        }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save')
      }
      const updated = await response.json()
      setActiveEditorPage((prev) =>
        prev ? { ...prev, ...updated, contentJson: updated.contentJson ?? contentJson } : null
      )
      window.dispatchEvent(new CustomEvent('workspacePagesRefreshed'))
      window.dispatchEvent(new CustomEvent('pageCreated'))
    } catch (err) {
      console.error('Error saving page:', err)
      setError(err instanceof Error ? err.message : 'Failed to save')
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [activeEditorPage, newPageTitle])

  const _toggleFavorite = async (page: RecentPage) => {
    try {
      const isCurrentlyFavorite = favoritePages.some(fav => fav.id === page.id)
      
      if (isCurrentlyFavorite) {
        // Remove from favorites
        const response = await fetch(`/api/wiki/pages/${page.id}/favorite`, {
          method: 'DELETE'
        })
        if (response.ok) {
          setFavoritePages(prev => prev.filter(fav => fav.id !== page.id))
          // Dispatch event to refresh favorites in other components
          window.dispatchEvent(new CustomEvent('favoritesChanged'))
        }
      } else {
        // Add to favorites
        const response = await fetch(`/api/wiki/pages/${page.id}/favorite`, {
          method: 'POST'
        })
        if (response.ok) {
          // Refresh favorites list from server
          const favoritesResponse = await fetch('/api/wiki/favorites')
          if (favoritesResponse.ok) {
            const favoritesData = await favoritesResponse.json()
            setFavoritePages(Array.isArray(favoritesData) ? favoritesData : [])
            // Dispatch event to refresh favorites in other components
            window.dispatchEvent(new CustomEvent('favoritesChanged'))
          }
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const handleSavePage = async (jsonContent?: JSONContent) => {
    
    if (!newPageTitle.trim()) {
      setError("Please enter a title")
      return
    }

    if (!workspaceId) {
      console.error('Workspace ID is missing!')
      setError("Workspace not found")
      return
    }

    // Read live content: prefer explicit arg, then editor (at click time), then ref from onChange
    const contentToSave = jsonContent 
      ?? (editorRef.current?.getJSON?.() ?? null)
      ?? latestContentRef.current
      ?? initialContent

    try {
      setIsSaving(true)
      setError(null)
      
      // Determine workspace_type based on selected workspace
      let workspaceType = 'team'
      if (selectedWorkspaceForPage) {
        // Handle special cases like 'personal-space' or 'team-workspace' strings
        if (selectedWorkspaceForPage === 'personal-space') {
          // Find the personal workspace by type
          const personalWorkspace = workspaces.find(w => w.type === 'personal' || w.id?.startsWith('personal-space-'))
          if (personalWorkspace) {
            workspaceType = 'personal'
          }
        } else if (selectedWorkspaceForPage === 'team-workspace') {
          // Handle team-workspace string - explicitly set to 'team'
          workspaceType = 'team'
        } else {
          const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceForPage)
          
          if (selectedWorkspace?.type === 'personal') {
            workspaceType = 'personal'
          } else if (selectedWorkspace?.type === 'team') {
            workspaceType = 'team'
          } else if (selectedWorkspace?.id) {
            // For custom workspaces, use the workspace ID
            workspaceType = selectedWorkspace.id
          }
        }
      } else {
        // If no workspace selected, determine from current path
        if (pathname.includes('/wiki/personal-space')) {
          workspaceType = 'personal'
        } else if (pathname.includes('/wiki/team-workspace')) {
          workspaceType = 'team'
        } else if (pathname.includes('/wiki/workspace/')) {
          // Extract workspace ID from pathname for custom workspaces
          const match = pathname.match(/\/wiki\/workspace\/([^\/]+)/)
          if (match && match[1]) {
            workspaceType = match[1]
          }
        }
      }
      
      
      // Use centralized helper to create page
      const { createWikiPage } = await import('@/lib/wiki/create-page')
      const newPage = await createWikiPage({
        workspaceId,
        title: newPageTitle.trim(),
        contentJson: contentToSave,
        tags: [],
        category: newPageCategory,
        permissionLevel: isPersonalPage ? 'personal' : 'team',
        workspace_type: workspaceType
      })

      
      setIsCreatingPage(false)
      setNewPageTitle("")
      setNewPageCategory("general")
      
      // Refresh recent pages
      const recentResponse = await fetch('/api/wiki/recent-pages')
      if (recentResponse.ok) {
        const recentData = await recentResponse.json()
        setRecentPages(recentData)
      }
      
      // Refresh page counts
      const countsResponse = await fetch('/api/wiki/page-counts')
      if (countsResponse.ok) {
        const countsData = await countsResponse.json()
        setPageCounts(countsData)
      }
      
      // Dispatch events to refresh workspace pages and page counts
      window.dispatchEvent(new CustomEvent('workspacePagesRefreshed'))
      window.dispatchEvent(new CustomEvent('pageCreated'))
      
      // In-place transition: no navigation, stay in same view
      justSavedInPlaceRef.current = true
      setActiveEditorPage({
        id: newPage.id,
        slug: newPage.slug,
        title: newPage.title,
        contentJson: newPage.contentJson ?? contentToSave,
        contentFormat: 'JSON',
        excerpt: newPage.excerpt ?? null,
        tags: newPage.tags ?? [],
        category: newPage.category ?? newPageCategory,
        isPublished: newPage.isPublished ?? true,
        updatedAt: newPage.updatedAt ?? new Date().toISOString(),
        workspace_type: newPage.workspace_type,
        permissionLevel: newPage.permissionLevel ?? newPage.workspace_type,
      })
      setNewPageTitle(newPage.title)
      
      // Update URL for shareability without triggering navigation
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `/wiki/${newPage.slug}?edit=true`)
      }
    } catch (error) {
      console.error('Error creating page:', error)
      setError(error instanceof Error ? error.message : 'Failed to create page. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Update workspaceId when context changes (no API call needed)
  useEffect(() => {
    if (!workspaceId && contextWorkspaceId) {
      setWorkspaceId(contextWorkspaceId)
    }
  }, [workspaceId, contextWorkspaceId])

  // Load workspaces and page counts - always load regardless of workspaceId
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const [workspacesResponse, countsResponse] = await Promise.all([
          fetch('/api/wiki/workspaces'),
          fetch('/api/wiki/page-counts')
        ])
        
        if (workspacesResponse.ok) {
          const workspacesData = await workspacesResponse.json()
          
          // Ensure workspacesData is an array with valid data
          if (!Array.isArray(workspacesData)) {
            console.error('❌ Workspaces response is not an array:', workspacesData)
            setWorkspaces([])
          } else {
            // Filter out empty objects and validate data
            const validWorkspaces = workspacesData.filter((w: WikiWorkspace) => w && (w.id || w.name))
            
            if (validWorkspaces.length === 0 && workspacesData.length > 0) {
              console.error('❌ All workspaces are empty objects:', workspacesData)
            }
            
            // Normalize workspace names on the frontend
            const normalizedWorkspaces = validWorkspaces.map((w: WikiWorkspace) => {
              // Check if this is a default Personal Space
              if (w.id?.startsWith('personal-space-')) {
                return { ...w, name: 'Personal Space' }
              }
              // For all other workspaces (including Team Workspace if it exists), keep their original names
              return w
            })
            
            
            setWorkspaces(normalizedWorkspaces)
          }
        } else {
          console.error('❌ Failed to fetch workspaces:', workspacesResponse.status, workspacesResponse.statusText)
        }

        if (countsResponse.ok) {
          const countsData = await countsResponse.json()
          setPageCounts(countsData)
        } else {
          const errorData = await countsResponse.json().catch(() => ({}))
          console.error('❌ Failed to fetch page counts:', countsResponse.status, countsResponse.statusText, errorData)
          // Don't fail completely - just log the error and continue with empty counts
          setPageCounts({})
        }
      } catch (error) {
        console.error('Error loading workspaces:', error)
      }
    }

    loadWorkspaces()
  }, []) // Load once on mount

  // Load favorites and page counts - these don't depend on workspaceId
  useEffect(() => {
    const loadGlobalData = async () => {
      try {
        const [favoritesResponse, countsResponse] = await Promise.all([
          fetch('/api/wiki/favorites'),
          fetch('/api/wiki/page-counts')
        ])

        if (favoritesResponse.ok) {
          const favoritesData = await favoritesResponse.json()
          setFavoritePages(Array.isArray(favoritesData) ? favoritesData : [])
        } else {
          console.error('Failed to load favorites:', favoritesResponse.status)
        }

        if (countsResponse.ok) {
          const countsData = await countsResponse.json()
          setPageCounts(countsData)
        } else {
          console.error('❌ Failed to fetch page counts:', countsResponse.status, countsResponse.statusText)
          // Don't fail completely - just log the error and continue with empty counts
          setPageCounts({})
        }
      } catch (error) {
        console.error('Error loading global wiki data:', error)
      }
    }

    loadGlobalData()
  }, []) // Load once on mount

  // Load recent pages and projects - depends on workspaceId
  useEffect(() => {
    if (!workspaceId) {
      setIsLoading(false)
      return // Don't load pages until we have workspaceId
    }
    
    const loadData = async () => {
      try {
        // Load all data in parallel for better performance
        // Note: We fetch all pages here for the sidebar, but each workspace will filter its own pages
        // The filtering happens client-side based on workspace_type to avoid multiple API calls
        const [recentResponse, projectsResponse] = await Promise.all([
          fetch('/api/wiki/recent-pages?limit=100'),
          fetch(`/api/projects?workspaceId=${workspaceId}`)
        ])

        // Process responses
        if (recentResponse.ok) {
          const recentData = await recentResponse.json()
          setRecentPages(recentData)
        }

        if (projectsResponse.ok) {
          const projectsResult = await projectsResponse.json()
          // Handle new response shape: { projects: Project[], contextObjects: ContextObject[] }
          const projectsData = Array.isArray(projectsResult) 
            ? projectsResult 
            : (projectsResult.projects || [])
          setProjects(Array.isArray(projectsData) ? projectsData : [])
        }
      } catch (error) {
        console.error('Error loading wiki data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [workspaceId])

  // Reset creation/editor state when navigating to existing pages (e.g. sidebar link)
  // Skip clearing when we just saved in-place (replaceState) or when pathname matches our edited page
  useEffect(() => {
    if (justSavedInPlaceRef.current) {
      justSavedInPlaceRef.current = false
      return
    }
    if (activeEditorPage && pathname.includes(`/wiki/${activeEditorPage.slug}`)) {
      return
    }
    if (pathname && !pathname.includes('/wiki/new') && pathname !== '/wiki') {
      setIsCreatingPage(false)
      setActiveEditorPage(null)
    }
  }, [pathname, activeEditorPage])

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
      // Refresh recent pages and page counts when a page is deleted
      const [recentResponse, countsResponse] = await Promise.all([
        fetch('/api/wiki/recent-pages'),
        fetch('/api/wiki/page-counts')
      ])
      if (recentResponse.ok) {
        const recentData = await recentResponse.json()
        setRecentPages(recentData)
      }
      if (countsResponse.ok) {
        const countsData = await countsResponse.json()
        setPageCounts(countsData)
      }
    }

    const handlePageCreated = async () => {
      // Refresh page counts when a page is created
      const countsResponse = await fetch('/api/wiki/page-counts')
      if (countsResponse.ok) {
        const countsData = await countsResponse.json()
        setPageCounts(countsData)
      }
    }

    window.addEventListener('favoritesChanged', handleFavoritesChanged)
    window.addEventListener('pageDeleted', handlePageDeleted)
    window.addEventListener('pageCreated', handlePageCreated)
    
    return () => {
      window.removeEventListener('favoritesChanged', handleFavoritesChanged)
      window.removeEventListener('pageDeleted', handlePageDeleted)
      window.removeEventListener('pageCreated', handlePageCreated)
    }
  }, [])

  const _formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const _recentPagesNonPersonal = useMemo(
    () => recentPages.filter(p => p.permissionLevel !== 'personal'),
    [recentPages]
  )

  const _personalWorkspacePages = useMemo(
    () =>
      recentPages.filter(p => {
        const pageWorkspaceType = p.workspace_type
        const pagePermissionLevel = p.permissionLevel
        if (pageWorkspaceType === 'personal') return true
        if (!pageWorkspaceType || pageWorkspaceType === null || pageWorkspaceType === undefined || pageWorkspaceType === '') {
          return pagePermissionLevel === 'personal'
        }
        return false
      }),
    [recentPages]
  )

  const _teamWorkspacePages = useMemo(
    () =>
      recentPages.filter(p => {
        const pageWorkspaceType = p.workspace_type
        const pagePermissionLevel = p.permissionLevel
        if (pageWorkspaceType === 'personal') return false
        if (
          pageWorkspaceType &&
          pageWorkspaceType !== 'team' &&
          pageWorkspaceType !== 'personal' &&
          pageWorkspaceType !== null &&
          pageWorkspaceType !== undefined &&
          pageWorkspaceType !== ''
        ) {
          return false
        }
        if (pagePermissionLevel === 'personal' && pageWorkspaceType !== 'team') return false
        if (pageWorkspaceType === 'team') return true
        if (!pageWorkspaceType || pageWorkspaceType === null || pageWorkspaceType === undefined || pageWorkspaceType === '') {
          return pagePermissionLevel !== 'personal'
        }
        return false
      }),
    [recentPages]
  )

  const _customWorkspacePagesMap = useMemo(() => {
    const map = new Map<string, RecentPage[]>()
    workspaces
      .filter(w => w.type !== 'personal' && w.type !== 'team')
      .forEach(workspace => {
        const pages = recentPages.filter(p => {
          const pageWorkspaceType = p.workspace_type
          return (
            pageWorkspaceType === workspace.id &&
            pageWorkspaceType !== 'team' &&
            pageWorkspaceType !== 'personal' &&
            pageWorkspaceType !== null &&
            pageWorkspaceType !== undefined &&
            pageWorkspaceType !== ''
          )
        })
        map.set(workspace.id, pages)
      })
    return map
  }, [recentPages, workspaces])

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
      <div className="h-full bg-background flex overflow-hidden">
      {/* Main Content Area */}
      <div className={cn(
        "flex-1 bg-background overflow-y-auto overflow-x-hidden h-screen transition-all duration-500 min-w-0",
        isAISidebarOpen && aiDisplayMode === 'sidebar' ? "mr-[384px]" : ""
      )}>
        {showLayoutEditor ? (
          /* Minimalistic Page Editor */
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
                onClick={() => {
                  const content = editorRef.current?.getJSON?.()
                  if (activeEditorPage) {
                    handleEditPageSave(content ?? activeEditorPage.contentJson)
                  } else {
                    handleSavePage(content)
                  }
                }}
                disabled={isSaving || !newPageTitle.trim()}
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
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-foreground w-10 h-10 rounded-full flex items-center justify-center p-0 bg-card/80 backdrop-blur-sm border border-border shadow-sm" 
                title={activeEditorPage ? 'Close' : 'Cancel'}
                onClick={() => activeEditorPage ? handleCloseLayoutEditor() : handleCancelCreate()}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground w-10 h-10 rounded-full flex items-center justify-center p-0 bg-card/80 backdrop-blur-sm border border-border shadow-sm" title="Share">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground w-10 h-10 rounded-full flex items-center justify-center p-0 bg-card/80 backdrop-blur-sm border border-border shadow-sm" title="Favorite">
                <Star className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-foreground w-10 h-10 rounded-full flex items-center justify-center p-0 bg-card/80 backdrop-blur-sm border border-border shadow-sm" 
                title="View"
                onClick={() => activeEditorPage && handleCloseLayoutEditor()}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground w-10 h-10 rounded-full flex items-center justify-center p-0 bg-card/80 backdrop-blur-sm border border-border shadow-sm" title="Comments">
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground w-10 h-10 rounded-full flex items-center justify-center p-0 bg-card/80 backdrop-blur-sm border border-border shadow-sm" title="AI Assistant">
                <Brain className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground w-10 h-10 rounded-full flex items-center justify-center p-0 bg-card/80 backdrop-blur-sm border border-border shadow-sm" title="More options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>

            {/* Main Editor Area - Clean Document */}
            <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-background min-h-screen w-full min-w-0">
              <div className="max-w-4xl mx-auto w-full min-w-0">
                {/* Page Info */}
                <div className="flex items-center justify-between gap-4 mb-6 w-full min-w-0">
                  <div className="text-sm text-gray-500 whitespace-nowrap flex-shrink-0">
                    {activeEditorPage
                      ? `Last updated ${new Date(activeEditorPage.updatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                      : 'New document'}
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
                  <WikiEditorShell
                    initialContent={activeEditorPage?.contentJson ?? initialContent}
                    onSave={activeEditorPage
                      ? handleEditPageSave
                      : async (content) => {
                          latestContentRef.current = content
                          // No-op: Don't create page on autosave; only manual Save creates
                        }}
                    placeholder="Click here to start writing"
                    className="min-h-[400px] border-none shadow-none bg-transparent"
                    onEditorReady={(editor) => {
                      editorRef.current = editor
                      latestContentRef.current = editor.getJSON()
                    }}
                  />
                </div>

                {/* Action Suggestions - Only show when editing */}
                <div className="flex items-center gap-3 sm:gap-6 text-sm text-gray-500 mt-8 flex-wrap overflow-x-auto w-full">
                  <button
                    type="button"
                    onClick={() => setShowTemplateDialog(true)}
                    className="flex items-center gap-2 hover:text-gray-700 whitespace-nowrap"
                  >
                    <Grid3X3 className="h-4 w-4 flex-shrink-0" />
                    <span>Use a template</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-gray-700 whitespace-nowrap">
                    <Upload className="h-4 w-4 flex-shrink-0" />
                    <span>Import</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-gray-700 whitespace-nowrap">
                    <Plus className="h-4 w-4 flex-shrink-0" />
                    <span>New subdoc</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-gray-700 whitespace-nowrap">
                    <Folder className="h-4 w-4 flex-shrink-0" />
                    <span>Convert to collection</span>
                  </button>
                </div>

              </div>
            </div>

            {/* AI Assistant - Bottom bar mode when creating/editing */}
            <WikiAIAssistant 
              currentTitle={newPageTitle}
              currentContent=""
              onContentUpdate={() => {}}
              onTitleUpdate={setNewPageTitle}
              workspaces={workspaces}
              recentPages={recentPages}
              onCreatePage={async (title, content, selectedWorkspaceId) => {
                // Create blank draft page first, then insert content after navigation
                if (!selectedWorkspaceId) {
                  throw new Error("Please select a workspace")
                }
                
                setIsSaving(true)
                setError(null)
                
                // Determine workspace_type based on selected workspace
                const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId)
                let workspaceType = 'team'
                
                if (selectedWorkspace?.type === 'personal') {
                  workspaceType = 'personal'
                } else if (selectedWorkspace?.type === 'team') {
                  workspaceType = 'team'
                } else if (selectedWorkspace?.id) {
                  workspaceType = selectedWorkspace.id
                }
                
                // Import empty doc constant for JSON format
                const { EMPTY_TIPTAP_DOC } = await import('@/lib/wiki/constants')
                
                try {
                  // Create blank draft page first
                  const response = await fetch('/api/wiki/pages', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      title: title.trim(),
                      contentJson: EMPTY_TIPTAP_DOC, // Use JSON format
                      contentFormat: 'JSON',
                      tags: [],
                      category: newPageCategory,
                      permissionLevel: selectedWorkspace?.type === 'personal' ? 'personal' : 'team',
                      workspace_type: workspaceType
                    })
                  })
                  
                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
                    throw new Error(errorData.error || 'Failed to create page')
                  }
                  
                  const newPage = await response.json()
                  
                  // Refresh recent pages
                  const recentResponse = await fetch('/api/wiki/recent-pages')
                  if (recentResponse.ok) {
                    const recentData = await recentResponse.json()
                    setRecentPages(recentData)
                  }
                  
                  // Dispatch event to refresh workspace pages
                  window.dispatchEvent(new CustomEvent('workspacePagesRefreshed'))
                  
                  // Note: Draft info should already be stored by the AI assistant component
                  // Just navigate to the new page - it will detect pendingPageDraft and start streaming
                  
                  // Small delay to ensure page is committed to database before navigation
                  await new Promise(resolve => setTimeout(resolve, 200))
                  
                  // Navigate to the new blank draft page with AI assistant open
                  router.push(`/wiki/${newPage.slug}?edit=true&ai=open`)
                } catch (error) {
                  console.error('Error creating page:', error)
                  throw error
                } finally {
                  setIsSaving(false)
                }
              }}
              onStartCreatingPage={() => {
                if (!isCreatingPage) {
                  setIsCreatingPage(true)
                }
              }}
              onOpenChange={setIsAISidebarOpen}
              onDisplayModeChange={setAiDisplayMode}
              mode="bottom-bar"
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

    {/* Template + Workspace Selection Dialog for New Page */}
    <Dialog open={showWorkspaceSelectDialog} onOpenChange={setShowWorkspaceSelectDialog}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-light text-2xl">Create new page</DialogTitle>
          <DialogDescription className="text-base font-light">
            Choose a workspace and template to get started
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 min-h-0 py-2">
          <TemplateSelector
            onSelect={handleTemplateSelect}
            onCancel={() => setShowWorkspaceSelectDialog(false)}
            workspaces={workspaces}
            selectedWorkspaceId={selectedWorkspaceForPage}
            onWorkspaceChange={setSelectedWorkspaceForPage}
          />
        </div>
      </DialogContent>
    </Dialog>

    {/* Use a template (insert into current editor) */}
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
              if (template) {
                editorRef.current?.commands?.setContent(template.content)
                latestContentRef.current = template.content
                if (!activeEditorPage && template.id !== 'blank') {
                  setNewPageTitle(template.name)
                  setNewPageCategory(template.category)
                }
              } else {
                editorRef.current?.commands?.setContent(EMPTY_TIPTAP_DOC)
                latestContentRef.current = EMPTY_TIPTAP_DOC
              }
            }}
            onCancel={() => setShowTemplateDialog(false)}
            workspaces={workspaces}
            selectedWorkspaceId={selectedWorkspaceForPage}
            onWorkspaceChange={setSelectedWorkspaceForPage}
            hideWorkspaceSelector
          />
        </div>
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

    <CreateSpaceDialog
      open={createSpaceOpen}
      onClose={() => setCreateSpaceOpen(false)}
      onCreated={() => setCreateSpaceOpen(false)}
    />
    </>
  )
}
