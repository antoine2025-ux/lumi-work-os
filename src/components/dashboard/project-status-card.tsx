"use client"

import { AlertCircle, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import Link from "next/link"

type ProjectStatusDisplay = "active" | "on-hold" | "completed" | "planning"

interface ProjectStatusCardProps {
  project: {
    id: string
    name: string
    status: string
    color?: string | null
    _count?: { tasks: number }
  }
  workspaceSlug: string
  taskSummary?: {
    total: number
    done: number
    overdue: number
  }
}

function mapStatus(status: string): ProjectStatusDisplay {
  const upper = status?.toUpperCase() ?? ""
  if (upper === "ACTIVE") return "active"
  if (upper === "ON_HOLD") return "on-hold"
  if (upper === "COMPLETED" || upper === "CANCELLED") return "completed"
  return "planning"
}

const statusConfig: Record<
  ProjectStatusDisplay,
  { label: string; color: string }
> = {
  active: { label: "Active", color: "bg-green-500" },
  "on-hold": { label: "On Hold", color: "bg-yellow-500" },
  completed: { label: "Completed", color: "bg-blue-500" },
  planning: { label: "Planning", color: "bg-gray-500" },
}

export function ProjectStatusCard({
  project,
  workspaceSlug,
  taskSummary,
}: ProjectStatusCardProps) {
  const progress =
    taskSummary && taskSummary.total > 0
      ? Math.round((taskSummary.done / taskSummary.total) * 100)
      : 0

  const hasBlockers = taskSummary !== undefined && taskSummary.overdue > 0
  const displayStatus = mapStatus(project.status)
  const config = statusConfig[displayStatus]
  const taskCount = project._count?.tasks ?? 0

  return (
    <Link href={`/w/${workspaceSlug}/projects/${project.id}`}>
      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full flex-shrink-0",
                !project.color && config.color
              )}
              style={
                project.color ? { backgroundColor: project.color } : undefined
              }
            />
            <h3 className="font-medium text-sm truncate">{project.name}</h3>
          </div>
          {hasBlockers && (
            <Badge variant="destructive" className="text-xs flex-shrink-0">
              <AlertCircle className="w-3 h-3 mr-1" />
              Blocked
            </Badge>
          )}
        </div>

        {taskSummary && taskSummary.total > 0 ? (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>{progress}% complete</span>
              <span>
                {taskSummary.done}/{taskSummary.total} tasks
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />

            {taskSummary.overdue > 0 && (
              <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {taskSummary.overdue} overdue
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-muted-foreground">
            {taskCount} {taskCount === 1 ? "task" : "tasks"}
          </div>
        )}
      </Card>
    </Link>
  )
}
