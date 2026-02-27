"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface ProjectCardProps {
  project: {
    id: string
    name: string
    status?: string
    updatedAt: string
    taskCount?: number
    progress?: number
    tasks?: { id: string; status: string }[]
    space?: { name: string }
    members?: { id: string }[]
  }
  workspaceSlug: string
}

const statusColors: Record<string, string> = {
  "On track": "text-green-500",
  "At risk": "text-amber-500",
  "Off track": "text-red-500",
  on_track: "text-green-500",
  at_risk: "text-amber-500",
  off_track: "text-red-500",
}

function deriveStatus(tasks: { status: string }[] | undefined): string {
  if (!tasks || tasks.length === 0) return "On track"
  const completed = tasks.filter((t) => t.status === "DONE").length
  const progress = Math.round((completed / tasks.length) * 100)
  if (progress >= 70) return "On track"
  if (progress >= 40) return "At risk"
  return "Off track"
}

function deriveProgress(tasks: { status: string }[] | undefined): number {
  if (!tasks || tasks.length === 0) return 0
  const completed = tasks.filter((t) => t.status === "DONE").length
  return Math.round((completed / tasks.length) * 100)
}

export function ProjectCard({ project, workspaceSlug }: ProjectCardProps) {
  const progress =
    project.progress ?? deriveProgress(project.tasks)
  const status =
    project.status ?? deriveStatus(project.tasks)
  const statusColor = statusColors[status] ?? "text-muted-foreground"
  const totalTasks = project.tasks?.length ?? project.taskCount ?? 0

  return (
    <Link
      href={`/w/${workspaceSlug}/projects/${project.id}`}
      className="block p-4 bg-card rounded-lg border hover:border-amber-500/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium truncate">{project.name}</h3>
        <span
          className={cn(
            "text-sm font-medium flex-shrink-0 ml-2",
            statusColor
          )}
        >
          {status}
        </span>
      </div>

      {project.space && (
        <p className="text-sm text-amber-500 mb-2">
          {project.space.name}
          {project.members != null && (
            <> · {project.members.length} members</>
          )}
        </p>
      )}

      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
        {totalTasks > 0 && <span>{totalTasks} tasks</span>}
        {progress > 0 && (
          <>
            {totalTasks > 0 && <span>·</span>}
            <span>{progress}%</span>
          </>
        )}
      </div>

      {progress > 0 && (
        <div className="w-full h-1 bg-muted rounded-full mb-3">
          <div
            className="h-full bg-amber-500 rounded-full transition-all"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Updated{" "}
        {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
      </p>
    </Link>
  )
}
