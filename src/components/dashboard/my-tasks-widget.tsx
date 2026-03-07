"use client"

import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckSquare, ChevronRight, Loader2, Target } from "lucide-react"
import Link from "next/link"
import { useWorkspace } from "@/lib/workspace-context"
import { cn } from "@/lib/utils"

interface MyTask {
  id: string
  title: string
  status: string
  dueDate: string | Date | null
  priority: string | null
  projectId: string
  project: {
    id: string
    name: string
    color: string | null
  }
}

interface MyTasksWidgetProps {
  className?: string
}

function formatDueDate(due: string | Date | null): string {
  if (!due) return "No due date"
  const d = new Date(due)
  if (Number.isNaN(d.getTime())) return "No due date"
  const now = new Date()
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return "Overdue"
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  if (diffDays < 7) return `In ${diffDays} days`
  return d.toLocaleDateString()
}

function isOverdue(due: string | Date | null): boolean {
  if (!due) return false
  const d = new Date(due)
  return d < new Date() && d.toDateString() !== new Date().toDateString()
}

export function MyTasksWidget({ className }: MyTasksWidgetProps) {
  const { currentWorkspace } = useWorkspace()
  const baseHref = currentWorkspace?.slug ? `/w/${currentWorkspace.slug}` : ""

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["my-tasks", "dashboard", currentWorkspace?.id],
    queryFn: async () => {
      const response = await fetch("/api/my-tasks?limit=10")
      if (!response.ok) throw new Error("Failed to fetch tasks")
      return response.json() as Promise<MyTask[]>
    },
    enabled: !!currentWorkspace,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  })

  return (
    <div className={cn("bg-card rounded-md border border-border flex flex-col h-full min-h-0", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" aria-hidden />
          <Link href={`${baseHref}/my-tasks`} className="hover:opacity-80 transition-opacity">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground cursor-pointer">My Tasks</h3>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {tasks.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {tasks.length}
            </Badge>
          )}
        </div>
      </div>
      <div className="p-3 flex-1 space-y-2 max-h-[340px] overflow-y-auto dashboard-card-scroll">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex items-center space-x-3 p-2 rounded-md animate-pulse"
              >
                <div className="w-4 h-4 bg-muted rounded flex-shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
                <div className="w-16 h-5 bg-muted rounded flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8">
            <CheckSquare className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              No tasks assigned
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tasks from your projects will appear here
            </p>
          </div>
        ) : (
          <>
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`${baseHref}/projects/${task.projectId}`}
                className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted transition-colors"
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    task.priority === "URGENT" && "bg-red-500",
                    task.priority === "HIGH" && "bg-orange-500",
                    task.priority === "MEDIUM" && "bg-amber-500",
                    (task.priority === "LOW" || !task.priority) && "bg-muted-foreground"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {task.project.name}
                    {task.dueDate && (
                      <span
                        className={cn(
                          " ml-1",
                          isOverdue(task.dueDate) && "text-destructive"
                        )}
                      >
                        · {formatDueDate(task.dueDate)}
                      </span>
                    )}
                  </p>
                </div>
                <Badge
                  variant={task.status === "DONE" ? "secondary" : "outline"}
                  className="text-[10px] flex-shrink-0"
                >
                  {task.status === "TODO"
                    ? "To Do"
                    : task.status === "IN_PROGRESS"
                      ? "In Progress"
                      : task.status === "DONE"
                        ? "Done"
                        : task.status}
                </Badge>
              </Link>
            ))}
            <Link href={`${baseHref}/my-tasks`} className="block pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-muted-foreground hover:text-foreground"
              >
                View all
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
