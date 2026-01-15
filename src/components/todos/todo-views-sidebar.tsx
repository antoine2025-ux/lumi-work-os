"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  CheckSquare, 
  UserCheck, 
  Send, 
  FileEdit, 
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { useState } from "react"

export type TodoViewType = 'my' | 'assignedToMe' | 'assignedByMe' | 'created' | 'completed'

interface ViewOption {
  id: TodoViewType
  label: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
}

const viewOptions: ViewOption[] = [
  {
    id: 'my',
    label: 'My tasks',
    icon: CheckSquare,
    description: 'Tasks assigned to you'
  },
  {
    id: 'assignedToMe',
    label: 'Assigned to me',
    icon: UserCheck,
    description: 'Tasks others assigned to you'
  },
  {
    id: 'assignedByMe',
    label: 'Assigned by me',
    icon: Send,
    description: 'Tasks you delegated to others'
  },
  {
    id: 'created',
    label: 'Tasks created',
    icon: FileEdit,
    description: 'All tasks you created'
  },
  {
    id: 'completed',
    label: 'Completed',
    icon: CheckCircle2,
    description: 'Finished tasks'
  }
]

interface TodoViewsSidebarProps {
  activeView: TodoViewType
  onViewChange: (view: TodoViewType) => void
  counts?: Record<TodoViewType, number>
  className?: string
  collapsible?: boolean
}

export function TodoViewsSidebar({
  activeView,
  onViewChange,
  counts,
  className,
  collapsible = true
}: TodoViewsSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className={cn(
      "flex flex-col border-r bg-card/50",
      isCollapsed ? "w-14" : "w-52",
      "transition-all duration-200",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        {!isCollapsed && (
          <span className="text-sm font-medium text-muted-foreground">Views</span>
        )}
        {collapsible && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 shrink-0"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* View options */}
      <div className="flex-1 p-2 space-y-1">
        {viewOptions.map((view) => {
          const Icon = view.icon
          const isActive = activeView === view.id
          const count = counts?.[view.id]

          return (
            <Button
              key={view.id}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3",
                isCollapsed && "justify-center px-2",
                isActive && "bg-primary/10 text-primary hover:bg-primary/15"
              )}
              onClick={() => onViewChange(view.id)}
              title={isCollapsed ? view.label : undefined}
            >
              <Icon className={cn(
                "h-4 w-4 shrink-0",
                isActive ? "text-primary" : "text-muted-foreground"
              )} />
              
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left truncate">{view.label}</span>
                  {count !== undefined && count > 0 && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs px-1.5 py-0 h-5",
                        isActive && "bg-primary/20"
                      )}
                    >
                      {count}
                    </Badge>
                  )}
                </>
              )}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

// Export view options for use elsewhere
export { viewOptions }

