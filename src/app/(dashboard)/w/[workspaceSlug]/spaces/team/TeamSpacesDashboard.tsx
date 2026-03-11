"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { Folder, Plus, FileText } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CreateSpaceDialog } from "@/components/spaces/create-space-dialog"
import { cn } from "@/lib/utils"
import type { SpaceCardData } from "@/components/spaces/space-card"

function safeFormatDistance(dateStr: string | null | undefined): string {
  if (!dateStr) return ""
  try {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return ""
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return ""
  }
}

function formatDueDate(dueStr: string | null | undefined): string {
  if (!dueStr) return ""
  const d = new Date(dueStr)
  const now = new Date()
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return "Overdue"
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  if (diffDays < 7) return `In ${diffDays} days`
  return d.toLocaleDateString()
}

export interface TeamSpaceCardData extends SpaceCardData {
  updatedAt: string
  _count: SpaceCardData["_count"] & { members: number }
}

interface TeamSpacesDashboardProps {
  spaces: TeamSpaceCardData[]
}

export function TeamSpacesDashboard({ spaces }: TeamSpacesDashboardProps) {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const workspaceSlug = params?.workspaceSlug as string
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const baseHref = workspaceSlug ? `/w/${workspaceSlug}` : ""

  const { data: myProjects, isLoading: projectsLoading } = useQuery({
    queryKey: ["spaces", "team", "projects"],
    queryFn: () =>
      fetch("/api/spaces/team/projects").then((r) => {
        if (!r.ok) throw new Error("Failed to load projects")
        return r.json()
      }),
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: "always",
  })

  const { data: recentPages, isLoading: pagesLoading } = useQuery({
    queryKey: ["spaces", "team", "recent-pages"],
    queryFn: () =>
      fetch("/api/spaces/team/recent-pages").then((r) => {
        if (!r.ok) throw new Error("Failed to load recent pages")
        return r.json()
      }),
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
  })

  const { data: dueTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["spaces", "team", "due-tasks"],
    queryFn: () =>
      fetch("/api/spaces/team/due-tasks").then((r) => {
        if (!r.ok) throw new Error("Failed to load due tasks")
        return r.json()
      }),
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
  })

  const handleCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["spaces"] })
    router.refresh()
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Team Spaces</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overview of your team projects and activity
          </p>
        </div>
        <Button variant="ghostMuted" size="xs" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Create New Space
        </Button>
      </div>

      <CreateSpaceDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />

      {/* WORKING ON */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Working On
          </h2>
          <Link
            href={`${baseHref}/projects`}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {projectsLoading ? (
            <>
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </>
          ) : (myProjects ?? []).length === 0 ? (
            <p className="text-muted-foreground col-span-3">No active projects</p>
          ) : (
            (myProjects ?? []).map(
              (project: {
                id: string
                name: string
                space?: { name: string }
                tasks?: unknown[]
                updatedAt: string
              }) => (
                <Link
                  key={project.id}
                  href={`${baseHref}/projects/${project.id}`}
                  className="block p-4 bg-card rounded-md border border-border hover:border-primary/50 transition-colors"
                >
                  <h3 className="text-sm font-medium text-foreground mb-1">{project.name}</h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    {project.space?.name ?? "Unassigned"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Array.isArray(project.tasks) ? project.tasks.length : 0} tasks assigned
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Updated {safeFormatDistance(project.updatedAt)}
                  </p>
                </Link>
              )
            )
          )}
        </div>
      </section>

      {/* TEAM SPACES */}
      <section className="mb-8">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Team Spaces
        </h2>
        {spaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed rounded-lg bg-muted/30">
            <Folder className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              No team spaces yet. Create your first space to collaborate with your team.
            </p>
            <Button variant="ghostMuted" size="xs" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Create New Space
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {spaces.map((space) => (
              <Link
                key={space.id}
                href={`${baseHref}/spaces/${space.id}`}
                className="block p-4 bg-card/50 hover:bg-card rounded-md transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Folder className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">{space.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {space._count.projects} project{space._count.projects !== 1 ? "s" : ""} ·{" "}
                  {space._count.wikiPages} page{space._count.wikiPages !== 1 ? "s" : ""}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* RECENT ACTIVITY + DUE SOON — 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* RECENT ACTIVITY */}
        <section>
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
            Recent Activity
          </h2>
          <div className="space-y-1">
            {pagesLoading ? (
              <>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 flex-1 max-w-[200px]" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </>
            ) : (recentPages ?? []).length === 0 ? (
              <p className="text-muted-foreground px-3">No recent activity</p>
            ) : (
              (recentPages ?? []).map(
                (page: {
                  id: string
                  title: string
                  slug: string
                  space?: { name: string }
                  updatedAt: string
                }) => (
                  <Link
                    key={page.id}
                    href={`/wiki/${page.slug}`}
                    className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted transition-colors text-sm text-primary hover:underline"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">{page.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                      <span className="text-muted-foreground">
                        {page.space?.name ?? "Personal"}
                      </span>
                      <span>·</span>
                      <span>{safeFormatDistance(page.updatedAt)}</span>
                    </div>
                  </Link>
                )
              )
            )}
          </div>
        </section>

        {/* DUE SOON */}
        <section>
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
            Due Soon
          </h2>
          <div className="space-y-2">
            {tasksLoading ? (
              <>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3">
                    <Skeleton className="h-2 w-2 rounded-full flex-shrink-0" />
                    <Skeleton className="h-4 flex-1 max-w-[180px]" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                ))}
              </>
            ) : (dueTasks ?? []).length === 0 ? (
              <p className="text-muted-foreground px-3">No tasks due soon</p>
            ) : (
              (dueTasks ?? []).map(
                (task: {
                  id: string
                  title: string
                  priority?: string
                  dueDate: string | null
                  project?: { id: string; name: string }
                }) => (
                  <Link
                    key={task.id}
                    href={`${baseHref}/projects/${task.project?.id ?? "#"}`}
                    className="flex items-center gap-3 py-2 px-3 rounded hover:bg-muted transition-colors text-sm text-primary hover:underline"
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        task.priority === "HIGH" && "bg-red-500",
                        task.priority === "MEDIUM" && "bg-amber-500",
                        (task.priority === "LOW" || !task.priority) && "bg-green-500"
                      )}
                    />
                    <span className="flex-1 min-w-0 truncate">{task.title}</span>
                    <span className="text-sm text-muted-foreground flex-shrink-0">
                      {formatDueDate(task.dueDate)}
                    </span>
                  </Link>
                )
              )
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
