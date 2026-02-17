"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Lightbulb,
  Play,
  MessageSquare,
  FolderKanban,
  Layers,
  CheckSquare,
  Milestone,
  Target,
} from "lucide-react"
import type { AdvisoryResponse } from "@/lib/loopbrain/agent/types"

interface AdvisorySuggestionProps {
  advisory: AdvisoryResponse
  onApprove: () => void
  onRefine: () => void
  insights?: string[]
}

const TYPE_ICONS: Record<string, typeof FolderKanban> = {
  project: FolderKanban,
  epic: Layers,
  task: CheckSquare,
  milestone: Milestone,
  goal: Target,
}

const TYPE_COLORS: Record<string, string> = {
  project: "text-blue-600 dark:text-blue-400",
  epic: "text-purple-600 dark:text-purple-400",
  task: "text-green-600 dark:text-green-400",
  milestone: "text-amber-600 dark:text-amber-400",
  goal: "text-rose-600 dark:text-rose-400",
}

/**
 * Build a tree structure from flat items with parent references.
 * Items with no parent are root nodes; items with parent = another item's name
 * become children of that node.
 */
function buildTree(items: AdvisoryResponse["suggestedStructure"]["items"]) {
  type TreeNode = (typeof items)[number] & { children: TreeNode[] }
  const nodeMap = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  // Create tree nodes
  for (const item of items) {
    nodeMap.set(item.name, { ...item, children: [] })
  }

  // Link children to parents
  for (const item of items) {
    const node = nodeMap.get(item.name)!
    if (item.parent && nodeMap.has(item.parent)) {
      nodeMap.get(item.parent)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

function TreeItem({
  node,
  depth = 0,
}: {
  node: ReturnType<typeof buildTree>[number]
  depth?: number
}) {
  const Icon = TYPE_ICONS[node.type] ?? CheckSquare
  const color = TYPE_COLORS[node.type] ?? "text-muted-foreground"

  return (
    <div>
      <div
        className="flex items-start gap-2 py-1"
        style={{ paddingLeft: `${depth * 20}px` }}
      >
        <Icon className={cn("h-3.5 w-3.5 flex-shrink-0 mt-0.5", color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-foreground leading-snug">
              {node.name}
            </span>
            <Badge
              variant="outline"
              className="text-[9px] px-1 py-0 h-3.5 font-medium text-muted-foreground border-muted-foreground/25"
            >
              {node.type}
            </Badge>
          </div>
          {node.description && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              {node.description}
            </p>
          )}
        </div>
      </div>
      {node.children.map((child) => (
        <TreeItem key={child.name} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

export function AdvisorySuggestion({
  advisory,
  onApprove,
  onRefine,
  insights,
}: AdvisorySuggestionProps) {
  const tree = buildTree(advisory.suggestedStructure.items)

  return (
    <div className="mt-3 rounded-lg border border-teal-200 dark:border-teal-800/50 bg-teal-50/50 dark:bg-teal-950/20 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-teal-200/60 dark:border-teal-800/30 bg-teal-100/40 dark:bg-teal-900/20">
        <p className="text-xs font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wide">
          Suggestion
        </p>
      </div>

      {/* Insights */}
      {insights && insights.length > 0 && (
        <div className="px-4 py-2.5 border-b border-indigo-200/40 dark:border-indigo-800/20 bg-indigo-50/30 dark:bg-indigo-950/10">
          <div className="space-y-1.5">
            {insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-snug">
                  {insight}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-sm text-foreground leading-relaxed">
          {advisory.analysis}
        </p>
      </div>

      {/* Structure tree */}
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          {advisory.suggestedStructure.summary}
        </p>
        <div className="space-y-0.5">
          {tree.map((root) => (
            <TreeItem key={root.name} node={root} />
          ))}
        </div>
      </div>

      {/* Follow-up question */}
      <div className="px-4 pb-3">
        <p className="text-sm text-foreground italic">
          {advisory.followUpQuestion}
        </p>
      </div>

      {/* Actions */}
      <div className="px-4 py-2.5 border-t border-teal-200/60 dark:border-teal-800/30 flex items-center gap-2">
        <button
          onClick={onApprove}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            "bg-teal-600 text-white hover:bg-teal-700"
          )}
        >
          <Play className="h-3 w-3" />
          Set it up
        </button>
        <button
          onClick={onRefine}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            "text-muted-foreground hover:bg-muted"
          )}
        >
          <MessageSquare className="h-3 w-3" />
          I want to adjust
        </button>
      </div>
    </div>
  )
}
