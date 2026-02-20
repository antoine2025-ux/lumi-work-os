"use client"

import { FileText, Target, CheckSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface QuickActionsProps {
  workspaceSlug: string
}

export function QuickActions({ workspaceSlug }: QuickActionsProps) {
  const router = useRouter()

  const actions = [
    {
      icon: FileText,
      label: "New Page",
      onClick: () => router.push("/wiki/new"),
    },
    {
      icon: Target,
      label: "New Project",
      onClick: () => router.push(`/w/${workspaceSlug}/projects/new`),
    },
    {
      icon: CheckSquare,
      label: "New Task",
      onClick: () => {
        // TODO: Open task creation - navigate to projects for now
        router.push(`/w/${workspaceSlug}/projects`)
      },
    },
  ]

  return (
    <div className="flex gap-3">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <Button
            key={action.label}
            variant="outline"
            onClick={action.onClick}
            className="flex-1"
          >
            <Icon className="w-4 h-4 mr-2" />
            {action.label}
          </Button>
        )
      })}
    </div>
  )
}
