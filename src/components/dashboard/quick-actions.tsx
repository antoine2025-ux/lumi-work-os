"use client"

import { CheckSquare, Sparkles, Plus, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AILogo } from "@/components/ai-logo"
import { useLoopbrainAssistant } from "@/components/loopbrain/assistant-context"
import { cn } from "@/lib/utils"

interface QuickActionsProps {
  workspaceSlug: string
  className?: string
}

export function QuickActions({ workspaceSlug, className }: QuickActionsProps) {
  const { state, setIsOpen } = useLoopbrainAssistant()
  const isLoopbrainOpen = state.isOpen && !state.isMinimized

  return (
    <div className={cn("bg-card rounded-md border border-border flex flex-col h-full min-h-0", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quick Actions</h3>
        </div>
      </div>
      <div className="p-3 flex-1">
        <div className="grid grid-cols-2 gap-2">
          <Link href="/todos">
            <Button variant="outline" size="sm" className="h-12 w-full">
              <CheckSquare className="h-4 w-4 mr-2" />
              Add To-do
            </Button>
          </Link>
          <Link href="/wiki/new">
            <Button variant="outline" size="sm" className="h-12 w-full">
              <Plus className="h-4 w-4 mr-2" />
              New Page
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => setIsOpen(!isLoopbrainOpen)}
            className={cn(
              "flex items-center justify-center gap-2 h-12 w-full rounded-md border transition-colors",
              isLoopbrainOpen
                ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                : "bg-muted hover:bg-muted/80 border-border"
            )}
            title={isLoopbrainOpen ? "Close Loopbrain" : "Open Loopbrain"}
          >
            <AILogo width={16} height={16} className="flex-shrink-0" />
            <span>LoopBrain</span>
          </button>
          <Button variant="outline" size="sm" className="h-12" disabled>
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>
    </div>
  )
}
