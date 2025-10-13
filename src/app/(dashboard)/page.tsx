"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useWorkspace } from "@/lib/workspace-context"
import {
  Plus,
  BookOpen,
  Bot,
  FileText,
  Clock,
  Star,
  TrendingUp,
  Users,
  Settings,
  Bell,
  ChevronRight,
  Sparkles,
  Zap,
  Lightbulb,
  Calendar,
  Building2,
  Target,
  Activity
} from "lucide-react"
import { ContextMenu, contextMenuItems } from "@/components/ui/context-menu"
import { useTheme } from "@/components/theme-provider"

interface RecentPage {
  id: string
  title: string
  slug: string
  updatedAt: string
  category: string
}

interface Project {
  id: string
  name: string
  description?: string
  status: string
  createdAt: string
  updatedAt: string
  taskCount?: number
}

export default function HomePage() {
  const { currentWorkspace, userRole, canCreateProjects, canViewAnalytics, isLoading: workspaceLoading } = useWorkspace()
  const { themeConfig } = useTheme()
  const [recentPages, setRecentPages] = useState<RecentPage[]>([])
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [isLoadingRecentPages, setIsLoadingRecentPages] = useState(true)
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)

  // Load recent pages from API
  useEffect(() => {
    const loadRecentPages = async () => {
      if (!currentWorkspace) return // Wait for workspace to load
      
      try {
        const response = await fetch(`/api/wiki/pages?workspaceId=${currentWorkspace.id}`)
        if (response.ok) {
          const result = await response.json()
          // Handle paginated response - data is in result.data
          const data = result.data || result
          // Ensure data is an array before sorting
          if (Array.isArray(data)) {
            // Sort by updatedAt and take the 4 most recent
            const sortedPages = data
              .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 4)
            setRecentPages(sortedPages)
          } else {
            console.warn('Expected array but got:', typeof data, data)
            setRecentPages([])
          }
        } else if (response.status === 401) {
          // User not authenticated, show empty state
          console.log('User not authenticated, showing empty state')
          setRecentPages([])
        } else {
          console.error('Failed to load recent pages:', response.status)
          setRecentPages([])
        }
      } catch (error) {
        console.error('Error loading recent pages:', error)
        setRecentPages([])
      } finally {
        setIsLoadingRecentPages(false)
      }
    }

    loadRecentPages()
  }, [currentWorkspace]) // Depend on currentWorkspace instead of empty array

  // Load recent projects from API
  useEffect(() => {
    const loadRecentProjects = async () => {
      if (!currentWorkspace) return // Wait for workspace to load
      
      try {
        const response = await fetch(`/api/projects?workspaceId=${currentWorkspace.id}`)
        if (response.ok) {
          const result = await response.json()
          // Handle both paginated and direct array responses
          const data = result.data || result
          // Ensure data is an array before sorting
          if (Array.isArray(data)) {
            // Sort by updatedAt and take the 6 most recent
            const sortedProjects = data
              .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 6)
            setRecentProjects(sortedProjects)
          } else {
            console.warn('Expected array but got:', typeof data, data)
            setRecentProjects([])
          }
        } else {
          setRecentProjects([])
        }
      } catch (error) {
        console.error('Error loading recent projects:', error)
        setRecentProjects([])
      } finally {
        setIsLoadingProjects(false)
      }
    }

    loadRecentProjects()
  }, [currentWorkspace]) // Depend on currentWorkspace instead of empty array

  // Quick actions with proper redirects
  const quickActions = [
    { title: "New Page", description: "Create a new wiki page", icon: Plus, href: "/wiki/new", color: "bg-blue-500", disabled: false },
    { title: "Ask Lumi AI", description: "Get help from AI assistant", icon: Bot, href: "/ask", color: "bg-purple-500", disabled: false },
    { title: "Browse Wiki", description: "Explore knowledge base", icon: BookOpen, href: "#", color: "bg-green-500", disabled: true },
    { title: "Search", description: "Find anything quickly", icon: FileText, href: "#", color: "bg-orange-500", disabled: true },
  ]

  // Helper function to format time ago
  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
    return `${Math.floor(diffInSeconds / 604800)} weeks ago`
  }

  // Helper function to get icon based on category
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'engineering': return FileText
      case 'sales': return TrendingUp
      case 'marketing': return Sparkles
      case 'hr': return Users
      case 'product': return Star
      default: return BookOpen
    }
  }

  // Show loading state if workspace is still loading
  if (workspaceLoading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2" style={{color:'#0f172a'}}>Loading workspace...</h2>
          <p style={{color:'#475569'}}>Please wait while we load your workspace.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2" style={{ color: themeConfig.foreground }}>
          Good morning! 👋
          {currentWorkspace && (
            <span className="text-lg font-normal ml-2" style={{ color: themeConfig.mutedForeground }}>
              Welcome to {currentWorkspace.name}
            </span>
          )}
        </h2>
        <p style={{ color: themeConfig.mutedForeground }}>
          Here's what's happening in your workspace today.
          {userRole && (
            <span className="ml-2 text-xs px-2 py-1 rounded" style={{ backgroundColor: themeConfig.accent, color: themeConfig.accentForeground }}>
              {userRole}
            </span>
          )}
          <span className="ml-2 text-xs px-2 py-1 rounded" style={{ backgroundColor: themeConfig.muted, color: themeConfig.mutedForeground }}>
            Press ⌘K for commands, right-click for actions
          </span>
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4" style={{ color: themeConfig.foreground }}>Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <div key={index}>
              {action.disabled ? (
                <div className="cursor-not-allowed opacity-50">
                  <Card className="transition-all duration-200 group">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center transition-transform`}>
                          <action.icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium" style={{ color: themeConfig.foreground }}>{action.title}</h4>
                          <p className="text-sm" style={{ color: themeConfig.mutedForeground }}>{action.description}</p>
                          <p className="text-xs mt-1" style={{ color: themeConfig.mutedForeground }}>Coming Soon</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Link href={action.href}>
                  <Card className="transition-all duration-200 group hover:shadow-md cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform`}>
                          <action.icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium group-hover:opacity-80 transition-colors" style={{ color: themeConfig.foreground }}>{action.title}</h4>
                          <p className="text-sm" style={{ color: themeConfig.mutedForeground }}>{action.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Projects */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: themeConfig.foreground }}>Recent Projects</h3>
          <div className="flex items-center space-x-2">
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                View all
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            {canCreateProjects && (
              <Link href="/projects/new">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-1" />
                  New Project
                </Button>
              </Link>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoadingProjects || workspaceLoading ? (
            [...Array(6)].map((_, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : recentProjects.length > 0 ? (
            recentProjects.map((project) => (
              <ContextMenu key={project.id} items={contextMenuItems.project(project)}>
                <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group">
                  <CardContent className="p-4">
                    <Link href={`/projects/${project.id}`} className="block">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <Building2 className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium group-hover:opacity-80 transition-colors truncate" style={{ color: themeConfig.foreground }}>
                              {project.name}
                            </h4>
                            <p className="text-sm" style={{ color: themeConfig.mutedForeground }}>{getTimeAgo(project.updatedAt)}</p>
                          </div>
                        </div>
                        {project.description && (
                          <p className="text-sm line-clamp-2" style={{ color: themeConfig.mutedForeground }}>{project.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            project.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : project.status === 'completed'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {project.status}
                          </span>
                          {project.taskCount !== undefined && (
                            <span className="text-xs text-gray-500">
                              {project.taskCount} tasks
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              </ContextMenu>
            ))
          ) : (
            <div className="col-span-full">
              <Card>
                <CardContent className="p-8 text-center">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                  <p className="text-gray-500 mb-4">Get started by creating your first project</p>
                  {canCreateProjects && (
                    <Link href="/projects/new">
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Project
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Recent Pages */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: themeConfig.foreground }}>Recent Pages</h3>
          <Link href="/wiki">
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
              View all
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="space-y-2">
          {isLoadingRecentPages || workspaceLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recentPages.length > 0 ? (
            recentPages.map((page) => {
              const IconComponent = getCategoryIcon(page.category)
              const wikiPage = { id: page.id, title: page.title, slug: page.slug }
              return (
                <ContextMenu key={page.id} items={contextMenuItems.wiki(wikiPage)}>
                  <Card className="hover:shadow-sm transition-all duration-200 cursor-pointer group">
                    <CardContent className="p-4">
                      <Link href={`/wiki/${page.slug}`} className="block">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                            <IconComponent className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium group-hover:opacity-80 transition-colors" style={{ color: themeConfig.foreground }}>{page.title}</h4>
                            <p className="text-sm" style={{ color: themeConfig.mutedForeground }}>{getTimeAgo(page.updatedAt)}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                        </div>
                      </Link>
                    </CardContent>
                  </Card>
                </ContextMenu>
              )
            })
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="font-medium mb-2" style={{ color: themeConfig.foreground }}>No pages yet</h4>
                <p className="text-sm mb-4" style={{ color: themeConfig.mutedForeground }}>Create your first wiki page to get started</p>
                <Link href="/wiki/new">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Page
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4" style={{ color: themeConfig.foreground }}>AI Suggestions</h3>
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Lightbulb className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-2" style={{ color: themeConfig.foreground }}>Create a Remote Work Policy</h4>
                <p className="text-sm mb-3" style={{ color: themeConfig.mutedForeground }}>Based on your recent activity, you might want to create a comprehensive remote work policy for your team.</p>
                <div className="flex space-x-2">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                    <Zap className="h-4 w-4 mr-2" />
                    Generate with AI
                  </Button>
                  <Button size="sm" variant="outline">
                    Learn more
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Pages Created</p>
                <p className="text-2xl font-bold text-gray-900">24</p>
                <p className="text-xs text-green-600">+12% this month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Team Members</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
                <p className="text-xs text-blue-600">+2 this month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Bot className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">AI Interactions</p>
                <p className="text-2xl font-bold text-gray-900">156</p>
                <p className="text-xs text-purple-600">+45% this week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

