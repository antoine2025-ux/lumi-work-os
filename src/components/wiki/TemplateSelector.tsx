"use client"

import { useState, useEffect } from "react"
import {
  FileText,
  Calendar,
  Users,
  User,
  FileCode,
  Bug,
  BookOpen,
  Target,
  FileCheck,
  Package,
  ClipboardList,
  UserPlus,
  Layout,
  Globe,
  Trash2,
  Loader2,
  type LucideIcon,
} from "lucide-react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { WikiTemplate, WikiTemplateCategory } from "@/lib/wiki/templates"
import { WIKI_TEMPLATES } from "@/lib/wiki/templates"

const BLANK_TEMPLATE = WIKI_TEMPLATES[0]

export interface TemplateWithSource extends WikiTemplate {
  source: "builtin" | "user"
  createdByName?: string | null
}

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  Calendar,
  Users,
  User,
  FileCode,
  Bug,
  BookOpen,
  Target,
  FileCheck,
  Package,
  ClipboardList,
  UserPlus,
  Layout,
}

const CATEGORY_LABELS: Record<WikiTemplateCategory | "all", string> = {
  all: "All",
  meetings: "Meetings",
  engineering: "Engineering",
  product: "Product",
  operations: "Operations",
  general: "General",
  custom: "Custom",
}

const CATEGORY_BADGE_VARIANTS: Record<WikiTemplateCategory, string> = {
  meetings: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  engineering: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  product: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  operations: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  general: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  custom: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
}

interface WikiWorkspace {
  id: string
  name: string
  description?: string
  type: "personal" | "team" | "project"
  color: string
  icon: string
  pageCount: number
}

export interface TemplateSelectorProps {
  onSelect: (template: WikiTemplate | null) => void
  onCancel: () => void
  workspaces: WikiWorkspace[]
  selectedWorkspaceId: string | null
  onWorkspaceChange: (id: string) => void
  /** When true, hide workspace selector (e.g. when inserting into existing page) */
  hideWorkspaceSelector?: boolean
}

function filterTemplates(
  all: TemplateWithSource[],
  category: WikiTemplateCategory | "all"
): TemplateWithSource[] {
  if (category === "all") return all
  return all.filter((t) => t.category === category)
}

export function TemplateSelector({
  onSelect,
  onCancel,
  workspaces,
  selectedWorkspaceId,
  onWorkspaceChange,
  hideWorkspaceSelector = false,
}: TemplateSelectorProps) {
  const [category, setCategory] = useState<WikiTemplateCategory | "all">("all")
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [templates, setTemplates] = useState<TemplateWithSource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchTemplates() {
      setIsLoading(true)
      try {
        const res = await fetch("/api/wiki/templates")
        if (cancelled) return
        if (res.ok) {
          const data = (await res.json()) as { templates: TemplateWithSource[] }
          if (cancelled) return
          setTemplates(data.templates ?? [])
        } else {
          setTemplates(
            WIKI_TEMPLATES.map((t) => ({ ...t, source: "builtin" as const }))
          )
        }
      } catch {
        if (!cancelled)
          setTemplates(
            WIKI_TEMPLATES.map((t) => ({ ...t, source: "builtin" as const }))
          )
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchTemplates()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = filterTemplates(templates, category).filter((t) => t.id !== "blank")
  const displayTemplates = [BLANK_TEMPLATE as TemplateWithSource, ...filtered]
  const canSelectTemplate = hideWorkspaceSelector || selectedWorkspaceId !== null

  const handleTemplateClick = (template: TemplateWithSource | WikiTemplate) => {
    if (template.id === "blank" && !canSelectTemplate) return
    if (template.id !== "blank" && !canSelectTemplate) return
    onSelect(template.id === "blank" ? null : (template as WikiTemplate))
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (deletingId) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/wiki/templates/${id}`, { method: "DELETE" })
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id))
      }
    } finally {
      setDeletingId(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      const template = displayTemplates[index]
      if (template && (template.id === "blank" || canSelectTemplate)) {
        handleTemplateClick(template)
      }
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault()
      setFocusedIndex((prev) => Math.min(prev + 1, displayTemplates.length - 1))
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault()
      setFocusedIndex((prev) => Math.max(prev - 1, 0))
    }
  }

  return (
    <div className="space-y-4">
      {!hideWorkspaceSelector && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Workspace</label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {workspaces.map((workspace) => {
              const WorkspaceIcon =
                workspace.type === "personal"
                  ? FileText
                  : workspace.type === "team"
                    ? Users
                    : Globe
              return (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => onWorkspaceChange(workspace.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 border rounded-lg text-left transition-colors",
                    selectedWorkspaceId === workspace.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent hover:border-muted-foreground/20"
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <WorkspaceIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">{workspace.name}</div>
                  {workspace.description && (
                    <div className="text-sm text-muted-foreground truncate">
                      {workspace.description}
                    </div>
                  )}
                </div>
              </button>
              )
            })}
          </div>
          {!selectedWorkspaceId && workspaces.length > 0 && (
            <p className="text-xs text-muted-foreground">Select a workspace to create a page</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Template</label>
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {(["all", "meetings", "engineering", "product", "operations", "general", "custom"] as const).map(
            (cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={category === cat}
                onClick={() => {
                  setCategory(cat)
                  setFocusedIndex(0)
                }}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md transition-colors",
                  category === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            )
          )}
        </div>
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto"
        role="grid"
        aria-label="Template options"
      >
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          displayTemplates.map((template, index) => {
            const t = template as TemplateWithSource
            const IconComponent = ICON_MAP[template.icon] ?? FileText
            const isBlank = template.id === "blank"
            const isDisabled = !isBlank && !canSelectTemplate
            const isUserTemplate = t.source === "user"

            return (
              <Card
                key={template.id}
                role="gridcell"
                tabIndex={index === focusedIndex ? 0 : -1}
                className={cn(
                  "cursor-pointer transition-all duration-200 relative",
                  isDisabled && "opacity-60 cursor-not-allowed",
                  index === focusedIndex && "ring-2 ring-primary ring-offset-2"
                )}
                onClick={() => !isDisabled && handleTemplateClick(template)}
                onKeyDown={(e) => handleKeyDown(e, index)}
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-base font-medium truncate">{template.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isUserTemplate ? (
                        <>
                          {deletingId === template.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, template.id)}
                              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              title="Delete template"
                              aria-label="Delete template"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          <Badge variant="outline" className="text-xs">
                            by {t.createdByName ?? "Unknown"}
                          </Badge>
                        </>
                      ) : (
                        <>
                          {template.id !== "blank" && (
                            <Badge variant="secondary" className="text-xs">
                              Built-in
                            </Badge>
                          )}
                          {template.category !== "general" &&
                            template.id !== "blank" && (
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-xs",
                                  CATEGORY_BADGE_VARIANTS[template.category as WikiTemplateCategory]
                                )}
                              >
                                {CATEGORY_LABELS[template.category as WikiTemplateCategory]}
                              </Badge>
                            )}
                        </>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-sm line-clamp-2">
                    {template.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            )
          })
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
