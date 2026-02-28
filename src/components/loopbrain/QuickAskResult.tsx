"use client"

import { AlertCircle, RefreshCw, ArrowRight, Sparkles } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { LoopbrainResponse } from "@/lib/loopbrain/orchestrator-types"
import { useLoopbrainAssistant } from "./assistant-context"
import type { LoopbrainMode } from "@/lib/loopbrain/orchestrator-types"

interface QuickAskResultProps {
  query: string
  isLoading: boolean
  response: LoopbrainResponse | null
  error: string | null
  onReset: () => void
  /** Context anchors passed to the full panel when "Ask more" is clicked */
  anchors?: {
    projectId?: string
    pageId?: string
    taskId?: string
    roleId?: string
    teamId?: string
    personId?: string
  }
  mode?: LoopbrainMode
  className?: string
}

export function QuickAskResult({
  query,
  isLoading,
  response,
  error,
  onReset,
  anchors,
  mode = "spaces",
  className,
}: QuickAskResultProps) {
  const { setIsOpen, setMode, setAnchors, setPendingQuery } = useLoopbrainAssistant()

  function handleAskMore() {
    if (anchors) setAnchors(anchors)
    setMode(mode)
    setPendingQuery(query)
    setIsOpen(true)
  }

  if (isLoading) {
    return (
      <div className={cn("rounded-lg border border-border bg-muted/30 p-3 space-y-2", className)}>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 animate-pulse" />
          <span>Asking Loopbrain…</span>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("rounded-lg border border-destructive/20 bg-destructive/5 p-3", className)}>
        <div className="flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-destructive shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-destructive">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1.5 h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={onReset}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!response) return null

  return (
    <div className={cn("rounded-lg border border-border bg-muted/20 p-3 space-y-2", className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="font-medium truncate">{query}</span>
      </div>
      <div className="text-xs text-foreground/90 leading-relaxed prose prose-xs dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {response.answer}
        </ReactMarkdown>
      </div>
      <div className="flex items-center justify-between pt-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={onReset}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          New question
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-primary hover:text-primary/80"
          onClick={handleAskMore}
        >
          Ask more
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  )
}
