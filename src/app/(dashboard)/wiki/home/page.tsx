"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUserStatus } from "@/hooks/use-user-status"
import { 
  Clock, 
  FileText, 
  Folder, 
  Target,
  Home as HomeIcon,
  ChevronRight,
  Loader2
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { WikiAIAssistant } from "@/components/wiki/wiki-ai-assistant"

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
  updatedAt?: string
  createdAt?: string
}

interface RecentItem {
  id: string
  title: string
  type: 'page' | 'project'
  updatedAt: string
  url: string
  icon: React.ReactNode
  color?: string
}

export default function SpacesHomePage() {
  const router = useRouter()
  const { userStatus, loading: userStatusLoading } = useUserStatus()
  const [recentPages, setRecentPages] = useState<RecentPage[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInMinutes < 1) {
      return 'Just now'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInDays === 1) {
      return '1d ago'
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getIcon = (type: 'page' | 'project', color?: string) => {
    if (type === 'project') {
      return (
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: color ? `${color}20` : '#3B82F620' }}
        >
          <Target 
            className="h-4 w-4" 
            style={{ color: color || '#3B82F6' }}
          />
        </div>
      )
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
        <FileText className="h-4 w-4 text-indigo-600" />
      </div>
    )
  }

  useEffect(() => {
    const loadData = async () => {
      if (!userStatus?.workspaceId) return

      try {
        setIsLoading(true)

        // Fetch recent pages
        const pagesResponse = await fetch('/api/wiki/recent-pages?limit=10')
        if (pagesResponse.ok) {
          const pagesData = await pagesResponse.json()
          setRecentPages(pagesData)
        }

        // Fetch projects
        const projectsResponse = await fetch(`/api/projects?workspaceId=${userStatus.workspaceId}`)
        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json()
          // Handle both array and object responses
          const projectsList = Array.isArray(projectsData) ? projectsData : (projectsData.data || projectsData.projects || [])
          setProjects(projectsList)
        }
      } catch (error) {
        console.error('Error loading home data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (!userStatusLoading && userStatus) {
      loadData()
    }
  }, [userStatus, userStatusLoading])

  // Combine and sort recent items
  useEffect(() => {
    const items: RecentItem[] = []

    // Add recent pages
    recentPages.forEach(page => {
      items.push({
        id: page.id,
        title: page.title,
        type: 'page',
        updatedAt: page.updatedAt,
        url: `/wiki/${page.slug}`,
        icon: getIcon('page'),
        color: undefined
      })
    })

    // Add projects (using updatedAt or createdAt)
    projects.forEach(project => {
      items.push({
        id: project.id,
        title: project.name,
        type: 'project',
        updatedAt: project.updatedAt || project.createdAt || new Date().toISOString(),
        url: `/projects/${project.id}`,
        icon: getIcon('project', project.color),
        color: project.color
      })
    })

    // Sort by updatedAt descending
    items.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime()
      const dateB = new Date(b.updatedAt).getTime()
      return dateB - dateA
    })

    // Take only the most recent 6-8 items
    setRecentItems(items.slice(0, 8))
  }, [recentPages, projects])

  if (userStatusLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <style>{`
        .recent-items-scroll::-webkit-scrollbar {
          height: 8px;
        }
        .recent-items-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .recent-items-scroll::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 4px;
        }
        .recent-items-scroll:hover::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
        }
        @media (prefers-color-scheme: dark) {
          .recent-items-scroll:hover::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
          }
        }
      `}</style>
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Welcome Message */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-foreground mb-2">
            Welcome to your Space
          </h1>
        </div>

        {/* Recently Visited Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Recently visited</h2>
          </div>

          {recentItems.length > 0 ? (
            <div className="recent-items-scroll flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
              {recentItems.map((item) => (
                <Card
                  key={item.id}
                  className={cn(
                    "min-w-[240px] max-w-[240px] flex-shrink-0 cursor-pointer transition-all duration-200",
                    "hover:shadow-lg hover:border-primary/50 bg-card border-border",
                    "group"
                  )}
                  onClick={() => router.push(item.url)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-4">
                      {item.icon}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate mb-1 group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(item.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <p className="text-muted-foreground">
                No recent activity. Start by creating a page or project!
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* AI Assistant - Floating Button Mode */}
      <WikiAIAssistant 
        currentTitle="Home"
        mode="floating-button"
      />
    </div>
    </>
  )
}
