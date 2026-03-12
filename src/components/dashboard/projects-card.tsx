"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckSquare, Plus } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import Link from "next/link"

interface Project {
  id: string
  name: string
  status: string
  ownerId?: string | null
  updatedAt: Date
  members?: Array<{ role: string }>
  tasks?: Array<{ id: string; status: string }>
  userRole?: string
}

interface ProjectsCardProps {
  projects: Project[]
  workspaceSlug: string
  className?: string
}

export function ProjectsCard({ projects, workspaceSlug, className }: ProjectsCardProps) {
  const { themeConfig } = useTheme()

  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
    return `${Math.floor(diffInSeconds / 604800)} weeks ago`
  }

  return (
    <div className={cn("bg-card rounded-md border border-border flex flex-col h-full min-h-0", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Projects</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{projects.length}</Badge>
        </div>
      </div>
      <div className="p-3 flex-1 space-y-4 max-h-[340px] overflow-y-auto dashboard-card-scroll">
        {projects.length > 0 ? (
          projects.slice(0, 5).map((project) => {
            const completedTasks = project.tasks?.filter((t) => t.status === 'DONE').length || 0
            const totalTasks = project.tasks?.length || 0
            const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

            return (
              <Link key={project.id} href={`/w/${workspaceSlug}/projects/${project.id}`} className="block">
                <div className="space-y-1 p-2 rounded-lg hover:bg-muted transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        project.status === 'ACTIVE' ? 'bg-green-500' :
                        project.status === 'ON_HOLD' ? 'bg-yellow-500' :
                        project.status === 'COMPLETED' ? 'bg-blue-500' : 'bg-muted-foreground'
                      }`} />
                      <span className="text-sm font-medium truncate" style={{ color: themeConfig.foreground }}>
                        {project.name}
                      </span>
                      {project.userRole && (
                        <Badge
                          variant={project.userRole === 'OWNER' ? 'default' : 'secondary'}
                          className="text-xs flex-shrink-0"
                        >
                          {project.userRole === 'OWNER' ? 'Owner' : 'Member'}
                        </Badge>
                      )}
                    </div>
                    <Badge 
                      variant={project.status === 'ACTIVE' ? 'default' : 'secondary'}
                      className="text-xs flex-shrink-0 ml-2"
                    >
                      {project.status === 'ACTIVE' ? 'Active' :
                       project.status === 'ON_HOLD' ? 'On Hold' :
                       project.status === 'COMPLETED' ? 'Done' :
                       project.status === 'CANCELLED' ? 'Cancelled' : project.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: themeConfig.mutedForeground }}>
                      {completedTasks}/{totalTasks} tasks
                    </span>
                    {totalTasks > 0 && (
                      <div className="flex-1 max-w-[100px]">
                        <Progress value={progressPct} className="h-1" />
                      </div>
                    )}
                    <span className="text-xs" style={{ color: themeConfig.mutedForeground }}>
                      {getTimeAgo(project.updatedAt)}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">No projects yet</p>
            <Link href={`/w/${workspaceSlug}/projects/new`}>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Create Project
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}