"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import {
  User,
  Calendar,
  FileText,
  StickyNote,
  CheckSquare,
  Plus,
  Loader2,
  Target,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CreatePageDialog } from "./create-page-dialog"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { QuickNoteModal } from "./QuickNoteModal"
import { cn } from "@/lib/utils"
import { useWorkspace } from "@/lib/workspace-context"

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

export function PersonalSpaceView() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { currentWorkspace } = useWorkspace()
  const workspaceSlug = (params?.workspaceSlug as string | undefined) ?? currentWorkspace?.slug
  const [isCreatePageOpen, setIsCreatePageOpen] = useState(false)
  const [isCreatingPage, setIsCreatingPage] = useState(false)
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<{ id: string; title: string; content: string } | null>(null)

  const baseHref = workspaceSlug ? `/w/${workspaceSlug}` : ""

  const { data: myProjects, isLoading: projectsLoading } = useQuery({
    queryKey: ["spaces", "personal", "projects"],
    queryFn: () =>
      fetch("/api/spaces/personal/projects").then((r) => {
        if (!r.ok) throw new Error("Failed to load projects")
        return r.json()
      }),
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
  })

  const { data: recentPages, isLoading: pagesLoading } = useQuery({
    queryKey: ["spaces", "personal", "recent-pages"],
    queryFn: () =>
      fetch("/api/spaces/personal/recent-pages").then((r) => {
        if (!r.ok) throw new Error("Failed to load recent pages")
        return r.json()
      }),
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
  })

  const { data: personalNotes, isLoading: notesLoading, error: notesError } = useQuery({
    queryKey: ["personal-notes"],
    queryFn: async () => {
      try {
        const r = await fetch("/api/personal-notes")
        if (!r.ok) {
          // If API fails (e.g., table doesn't exist yet), return empty array
          console.warn("Personal notes API failed, returning empty array")
          return []
        }
        return r.json()
      } catch (error) {
        console.error("Failed to load personal notes:", error)
        return []
      }
    },
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  })

  const { data: dueTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["spaces", "personal", "due-tasks"],
    queryFn: () =>
      fetch("/api/spaces/personal/due-tasks").then((r) => {
        if (!r.ok) throw new Error("Failed to load due tasks")
        return r.json()
      }),
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
  })

  const { data: spacesData } = useQuery({
    queryKey: ["spaces", "list"],
    queryFn: () =>
      fetch("/api/spaces").then((r) => {
        if (!r.ok) throw new Error("Failed to load spaces")
        return r.json()
      }),
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
  })

  const personalSpace = (spacesData?.spaces as Array<{ id: string; name: string; isPersonal?: boolean }> | undefined)?.find(
    (s) => s.isPersonal
  )

  const createPageDirectly = async () => {
    if (!personalSpace || isCreatingPage) return
    setIsCreatingPage(true)
    try {
      const res = await fetch("/api/wiki/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled", spaceId: personalSpace.id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to create page")
      }
      const page = await res.json()
      queryClient.invalidateQueries({ queryKey: ["sidebar-pages"] })
      window.dispatchEvent(new CustomEvent("workspacePagesRefreshed"))
      router.push(`/wiki/${page.slug}?edit=true`)
    } catch {
      setIsCreatingPage(false)
    }
  }

  if (!workspaceSlug) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">My Work</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Spaces / Personal</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="h-8 gap-1.5 text-sm"
            onClick={() => (personalSpace ? createPageDirectly() : setIsCreatePageOpen(true))}
            disabled={personalSpace ? isCreatingPage : false}
          >
            {personalSpace && isCreatingPage ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            New Page
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-sm"
            onClick={() => setIsCreateProjectOpen(true)}
          >
            <Target className="w-4 h-4" />
            New Project
          </Button>
        </div>
      </div>

      {personalSpace ? null : (
        <CreatePageDialog
          open={isCreatePageOpen}
          onOpenChange={setIsCreatePageOpen}
          workspaceSlug={workspaceSlug}
        />
      )}

      <CreateProjectDialog
        open={isCreateProjectOpen}
        onOpenChange={setIsCreateProjectOpen}
        onProjectCreated={(project) => {
          router.push(`${baseHref}/projects/${project.id}`)
        }}
      />

      {/* WORKING ON - Projects from any team */}
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
            (myProjects ?? []).map((project: { id: string; name: string; space?: { name: string }; tasks?: unknown[]; updatedAt: string }) => (
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
                  {Array.isArray(project.tasks) ? project.tasks.length : 0} tasks
                  assigned
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Updated {safeFormatDistance(project.updatedAt)}
                </p>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* RECENT ACTIVITY, PERSONAL NOTES, DUE SOON - 3-column grid */}
      <div className="grid grid-cols-3 gap-6 mt-6">
        {/* RECENT ACTIVITY - Pages touched across workspace */}
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
                id: string;
                title: string;
                slug: string;
                space?: { name: string };
                updatedAt: string;
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

      {/* PERSONAL NOTES - Private */}
      <section className="mb-8">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Personal Notes
        </h2>
        <div className="space-y-1">
          {notesLoading ? (
            <>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 flex-1 max-w-[200px]" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </>
          ) : (
            (personalNotes ?? []).map(
              (note: { id: string; title: string; content: string; updatedAt: string }) => (
                <button
                  key={note.id}
                  onClick={() => {
                    setEditingNote(note)
                    setIsNoteModalOpen(true)
                  }}
                  className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted transition-colors text-sm text-primary hover:underline w-full text-left"
                >
                  <div className="flex items-center gap-3">
                    <StickyNote className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate">{note.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {safeFormatDistance(note.updatedAt)}
                  </span>
                </button>
              )
            )
          )}
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-3 py-2 px-3 text-muted-foreground hover:text-foreground w-full justify-start"
            onClick={() => {
              setEditingNote(null)
              setIsNoteModalOpen(true)
            }}
          >
            <Plus className="w-4 h-4" />
            Add note
          </Button>
        </div>
      </section>

      {/* DUE SOON - Tasks from any project */}
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
                id: string;
                title: string;
                priority?: string;
                dueDate: string | null;
                project?: { id: string; name: string };
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

      <QuickNoteModal
        open={isNoteModalOpen}
        onOpenChange={setIsNoteModalOpen}
        note={editingNote}
      />
    </div>
  )
}
