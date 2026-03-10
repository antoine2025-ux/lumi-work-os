"use client"

import { useState } from "react"
import {
  FileText,
  Code,
  Rocket,
  Megaphone,
  Users,
  Bug,
  Calendar,
  MapPin,
  type LucideIcon,
} from "lucide-react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type {
  ProjectTemplateData,
  ProjectTemplateCategory,
} from "@/lib/projects/templates"
import { PROJECT_TEMPLATES } from "@/lib/projects/templates"

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  Code,
  Rocket,
  Megaphone,
  Users,
  Bug,
  Calendar,
  MapPin,
}

const CATEGORY_LABELS: Record<ProjectTemplateCategory | "all", string> = {
  all: "All",
  engineering: "Engineering",
  product: "Product",
  marketing: "Marketing",
  operations: "Operations",
  general: "General",
}

const CATEGORY_BADGE_VARIANTS: Record<ProjectTemplateCategory, string> = {
  engineering: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  product: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  marketing: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  operations: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  general: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
}

function getTaskCount(template: ProjectTemplateData): number {
  return template.taskGroups.reduce(
    (sum, group) => sum + group.tasks.length,
    0
  )
}

function filterTemplates(
  all: ProjectTemplateData[],
  category: ProjectTemplateCategory | "all"
): ProjectTemplateData[] {
  if (category === "all") return all
  return all.filter((t) => t.category === category)
}

export interface ProjectTemplateSelectorProps {
  selectedTemplate: ProjectTemplateData | null
  onSelect: (template: ProjectTemplateData | null) => void
}

export function ProjectTemplateSelector({
  selectedTemplate,
  onSelect,
}: ProjectTemplateSelectorProps) {
  const [category, setCategory] = useState<ProjectTemplateCategory | "all">("all")

  const blankTemplate = PROJECT_TEMPLATES.find((t) => t.id === "blank")!
  const others = PROJECT_TEMPLATES.filter((t) => t.id !== "blank")
  const filtered = filterTemplates(others, category)
  const displayTemplates = [blankTemplate, ...filtered]

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Start from template
        </label>
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {(
            ["all", "engineering", "product", "marketing", "operations", "general"] as const
          ).map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={category === cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors",
                category === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto"
        role="grid"
        aria-label="Project template options"
      >
        {displayTemplates.map((template) => {
          const IconComponent = ICON_MAP[template.icon] ?? FileText
          const isBlank = template.id === "blank"
          const isSelected =
            (isBlank && selectedTemplate === null) ||
            selectedTemplate?.id === template.id
          const taskCount = getTaskCount(template)

          return (
            <Card
              key={template.id}
              role="gridcell"
              className={cn(
                "cursor-pointer transition-all duration-200",
                isSelected && "ring-2 ring-primary ring-offset-2"
              )}
              onClick={() => onSelect(isBlank ? null : template)}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <CardTitle className="text-base">{template.name}</CardTitle>
                  </div>
                  {!isBlank && (
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      {taskCount} tasks
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-sm line-clamp-2">
                  {template.description}
                </CardDescription>
                {!isBlank && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "w-fit text-xs",
                      CATEGORY_BADGE_VARIANTS[template.category]
                    )}
                  >
                    {CATEGORY_LABELS[template.category]}
                  </Badge>
                )}
              </CardHeader>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
