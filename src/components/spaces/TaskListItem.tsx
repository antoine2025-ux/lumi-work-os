"use client"

import { cn } from "@/lib/utils"

interface TaskListItemProps {
  title: string
  priority?: "LOW" | "MEDIUM" | "HIGH" | null
  dueDate?: string | null
  onToggle: () => void
}

const priorityColors: Record<string, string> = {
  HIGH: "bg-red-500",
  MEDIUM: "bg-amber-500",
  LOW: "bg-green-500",
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

export function TaskListItem({
  title,
  priority,
  dueDate,
  onToggle,
}: TaskListItemProps) {
  const color = priority ? priorityColors[priority] ?? "bg-muted-foreground" : "bg-muted-foreground"

  return (
    <div className="flex items-center gap-3 py-2">
      <input
        type="checkbox"
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        className="rounded border-input"
      />
      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", color)} />
      <span className="flex-1 min-w-0 truncate">{title}</span>
      {dueDate && (
        <span className="text-sm text-muted-foreground flex-shrink-0">
          {formatDueDate(dueDate)}
        </span>
      )}
    </div>
  )
}
