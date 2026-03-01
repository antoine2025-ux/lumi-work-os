"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Plus,
  Loader2,
  Target,
  Shield,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  FileText,
} from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useUserStatusContext } from "@/providers/user-status-provider"
import { cn } from "@/lib/utils"

interface WorkspacePageProps {
  params: Promise<{
    id: string
  }>
}

interface ChildPage {
  id: string
  title: string
  slug: string
  order: number
  updatedAt: string
}

interface WikiPageWithHierarchy {
  id: string
  title: string
  slug: string
  updatedAt: string
  parentId: string | null
  workspace_type: string | null
  children: ChildPage[]
  _count: { children: number }
}

interface WikiProject {
  id: string
  name: string
  updatedAt?: string
  createdAt?: string
  color?: string
}

interface WikiWorkspace {
  name: string
  description?: string
}

export default function WorkspacePage({ params }: WorkspacePageProps) {
  const router = useRouter()
  const pathname = usePathname()
  const userStatus = useUserStatusContext()
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [workspace, setWorkspace] = useState<WikiWorkspace | null>(null)
  const [workspacePages, setWorkspacePages] = useState<WikiPageWithHierarchy[]>([])
  const [projects, setProjects] = useState<WikiProject[]>([])
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const colors = {
    primary: 'var(--primary)',
    primaryLight: 'var(--accent)',
    primaryDark: 'var(--secondary)',
    success: '#10b981',
    successLight: '#d1fae5',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    error: 'var(--destructive)',
    errorLight: '#fee2e2',
    background: 'var(--background)',
    surface: 'var(--card)',
    text: 'var(--foreground)',
    textSecondary: 'var(--muted-foreground)',
    border: 'var(--border)',
    borderLight: 'var(--muted)'
  }

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params
      setResolvedParams(resolved)
    }
    resolveParams()
  }, [params])

  const loadWorkspacePages = useCallback(async () => {
    if (!resolvedParams?.id || !userStatus?.workspaceId) return

    try {
      setIsLoading(true)

      const [workspacesResponse, pagesResponse, projectsResponse] = await Promise.all([
        fetch('/api/wiki/workspaces'),
        fetch('/api/wiki/pages?limit=50'),
        fetch(`/api/projects?workspaceId=${userStatus.workspaceId}`)
      ])

      if (workspacesResponse.ok) {
        const workspacesData = await workspacesResponse.json()
        const foundWorkspace = workspacesData.find((w: { id?: string }) => w.id === resolvedParams.id)
        setWorkspace(foundWorkspace as WikiWorkspace ?? null)
      }

      if (pagesResponse.ok) {
        const result = await pagesResponse.json()
        const allPages = (result.data || result) as WikiPageWithHierarchy[]
        if (Array.isArray(allPages)) {
          const filtered = allPages.filter(p => p.workspace_type === resolvedParams.id)
          setWorkspacePages(filtered)
        }
      }

      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json()
        const projectsList = Array.isArray(projectsData) ? projectsData : (projectsData.data || projectsData.projects || [])
        setProjects(projectsList as WikiProject[])
      }
    } catch (error) {
      console.error('Error loading workspace data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [resolvedParams?.id, userStatus?.workspaceId])

  useEffect(() => {
    if (resolvedParams?.id) {
      loadWorkspacePages()
    }
  }, [resolvedParams?.id, loadWorkspacePages])

  useEffect(() => {
    if (pathname && pathname.includes(`/wiki/workspace/${resolvedParams?.id}`) && resolvedParams?.id) {
      loadWorkspacePages()
    }
  }, [pathname, resolvedParams?.id, loadWorkspacePages])

  useEffect(() => {
    const handlePageRefresh = () => {
      setTimeout(() => { loadWorkspacePages() }, 500)
      setTimeout(() => { loadWorkspacePages() }, 1500)
    }

    window.addEventListener('workspacePagesRefreshed', handlePageRefresh)
    window.addEventListener('pageDeleted', handlePageRefresh)

    const handleVisibilityChange = () => {
      if (!document.hidden && pathname && pathname.includes(`/wiki/workspace/${resolvedParams?.id}`) && resolvedParams?.id) {
        loadWorkspacePages()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('workspacePagesRefreshed', handlePageRefresh)
      window.removeEventListener('pageDeleted', handlePageRefresh)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pathname, resolvedParams?.id, loadWorkspacePages])

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInDays === 1) return '1d ago'
    if (diffInDays < 7) return `${diffInDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const handleCreatePage = () => {
    const win = window as unknown as { triggerCreatePageWithWorkspace?: (ws: string) => void }
    if (typeof window !== 'undefined' && win.triggerCreatePageWithWorkspace && resolvedParams?.id) {
      win.triggerCreatePageWithWorkspace(resolvedParams.id)
    }
  }

  const handleCreateInSection = (sectionId: string) => {
    const win = window as unknown as { triggerCreatePageInSection?: (ws: string, s: string) => void }
    if (win.triggerCreatePageInSection && resolvedParams?.id) {
      win.triggerCreatePageInSection(resolvedParams.id, sectionId)
    }
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Workspace not found</h2>
          <p className="text-muted-foreground mb-6">The requested workspace does not exist.</p>
          <Button onClick={() => router.push('/wiki')}>Go to Wiki</Button>
        </div>
      </div>
    )
  }

  const sections = workspacePages.filter(p => p.parentId === null && p._count.children > 0)
  const unsectioned = workspacePages.filter(p => p.parentId === null && p._count.children === 0)
  const isEmpty = workspacePages.length === 0 && projects.length === 0

  return (
    <>
      <div className="min-h-screen" style={{ backgroundColor: colors.background }}>
        {/* Header */}
        <div className="px-16 py-8 space-y-4">
          <div className="flex items-center space-x-3">
            <h1 className="text-4xl font-light" style={{ color: colors.text }}>{workspace.name}</h1>
          </div>
          <p className="text-lg max-w-2xl" style={{ color: colors.textSecondary }}>
            {workspace.description || 'Your custom workspace'}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="px-16 mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-light mb-2" style={{ color: colors.text }}>{workspacePages.length}</div>
              <div className="text-sm" style={{ color: colors.textSecondary }}>Total Pages</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-light mb-2" style={{ color: colors.success }}>{projects.length}</div>
              <div className="text-sm" style={{ color: colors.textSecondary }}>Projects</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-light mb-2" style={{ color: colors.primary }}>{sections.length}</div>
              <div className="text-sm" style={{ color: colors.textSecondary }}>Sections</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-light mb-2" style={{ color: colors.text }}>Custom</div>
              <div className="text-sm" style={{ color: colors.textSecondary }}>Workspace</div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-16">
          {isEmpty ? (
            <div className="space-y-8">
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                    <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-light" style={{ color: colors.text }}>This workspace is empty</h2>
                  <p className="text-sm max-w-md mx-auto" style={{ color: colors.textSecondary }}>
                    Create pages to organize content in this workspace. Pages created here will be associated with this workspace.
                  </p>
                </div>
              </div>
              <div className="flex justify-center pt-4">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                  onClick={handleCreatePage}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Page
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Section folder cards */}
              {sections.length > 0 && (
                <div className="space-y-3">
                  {sections.map(section => {
                    const isExpanded = !!expandedSections[section.id]
                    return (
                      <div
                        key={section.id}
                        className="border rounded-lg overflow-hidden"
                        style={{ borderColor: colors.border, backgroundColor: colors.surface }}
                      >
                        <div className="flex items-center gap-2 px-4 py-3">
                          <button
                            onClick={() => toggleSection(section.id)}
                            className="flex items-center gap-2 flex-1 min-w-0 text-left"
                          >
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            }
                            {isExpanded
                              ? <FolderOpen className="h-4 w-4 text-amber-500 flex-shrink-0" />
                              : <Folder className="h-4 w-4 text-amber-500 flex-shrink-0" />
                            }
                            <Link
                              href={`/wiki/${section.slug}`}
                              className="font-medium truncate hover:text-primary transition-colors"
                              style={{ color: colors.text }}
                              onClick={e => e.stopPropagation()}
                            >
                              {section.title}
                            </Link>
                          </button>
                          <span className="text-xs flex-shrink-0" style={{ color: colors.textSecondary }}>
                            {section.children.length} page{section.children.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {isExpanded && (
                          <div className="border-t" style={{ borderColor: colors.border }}>
                            {section.children.map(child => (
                              <Link
                                key={child.id}
                                href={`/wiki/${child.slug}`}
                                className={cn(
                                  "flex items-center gap-3 px-8 py-2.5 hover:bg-muted/50 transition-colors",
                                  "text-sm"
                                )}
                                style={{ color: colors.text }}
                              >
                                <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="flex-1 truncate">{child.title}</span>
                                <span className="text-xs flex-shrink-0" style={{ color: colors.textSecondary }}>
                                  {formatTimeAgo(child.updatedAt)}
                                </span>
                              </Link>
                            ))}
                            <div className="px-8 py-2 border-t" style={{ borderColor: colors.border }}>
                              <button
                                onClick={() => handleCreateInSection(section.id)}
                                className="flex items-center gap-2 text-xs hover:text-primary transition-colors"
                                style={{ color: colors.textSecondary }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Add page to this section
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Projects grid */}
              {projects.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>Projects</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map(project => (
                      <div
                        key={project.id}
                        className="border rounded-lg p-4 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
                        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                        onClick={() => router.push(`/projects/${project.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: project.color ? `${project.color}20` : undefined }}
                          >
                            <Target className="h-4 w-4" style={{ color: project.color || undefined }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate" style={{ color: colors.text }}>{project.name}</h3>
                            <p className="text-xs" style={{ color: colors.textSecondary }}>
                              {formatTimeAgo(project.updatedAt || project.createdAt || new Date().toISOString())}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unsectioned pages */}
              {unsectioned.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>Pages</h3>
                  <div className="space-y-1">
                    {unsectioned.map(page => (
                      <Link
                        key={page.id}
                        href={`/wiki/${page.slug}`}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                        style={{ color: colors.text }}
                      >
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="flex-1 truncate text-sm">{page.title}</span>
                        <span className="text-xs flex-shrink-0" style={{ color: colors.textSecondary }}>
                          {formatTimeAgo(page.updatedAt)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Create New Page */}
              <Button
                variant="outline"
                className="w-full"
                style={{ borderColor: colors.border }}
                onClick={handleCreatePage}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Page
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
