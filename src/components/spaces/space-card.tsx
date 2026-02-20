"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Folder, Globe, Lock, User, FileText, Target, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface SpaceCardData {
  id: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  visibility: "PERSONAL" | "PRIVATE" | "PUBLIC"
  isPersonal: boolean
  ownerId: string
  owner: { id: string; name: string | null; image: string | null } | null
  _count: { projects: number; wikiPages: number; children: number }
}

interface SpaceCardProps {
  space: SpaceCardData
  className?: string
}

function VisibilityBadge({ visibility }: { visibility: SpaceCardData["visibility"] }) {
  if (visibility === "PERSONAL") {
    return (
      <Badge variant="secondary" className="text-xs gap-1 py-0">
        <User className="w-2.5 h-2.5" />
        Personal
      </Badge>
    )
  }
  if (visibility === "PRIVATE") {
    return (
      <Badge variant="outline" className="text-xs gap-1 py-0">
        <Lock className="w-2.5 h-2.5" />
        Private
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-xs gap-1 py-0 text-muted-foreground">
      <Globe className="w-2.5 h-2.5" />
      Public
    </Badge>
  )
}

export function SpaceCard({ space, className }: SpaceCardProps) {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string
  const accent = space.color ?? "#3b82f6"

  return (
    <Link href={`/w/${workspaceSlug}/spaces/${space.id}`}>
      <Card
        className={cn(
          "group relative p-4 hover:shadow-md transition-all cursor-pointer border-l-4 h-full",
          className,
        )}
        style={{ borderLeftColor: accent }}
      >
        {/* Icon + name row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center"
              style={{ backgroundColor: `${accent}20` }}
            >
              <Folder className="w-4 h-4" style={{ color: accent }} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-tight truncate">{space.name}</h3>
              {space.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {space.description}
                </p>
              )}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Visibility badge */}
        <div className="mb-3">
          <VisibilityBadge visibility={space.visibility} />
        </div>

        {/* Counts */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            {space._count.projects} project{space._count.projects !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {space._count.wikiPages} page{space._count.wikiPages !== 1 ? "s" : ""}
          </span>
          {space._count.children > 0 && (
            <span className="flex items-center gap-1">
              <Folder className="w-3 h-3" />
              {space._count.children} folder{space._count.children !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </Card>
    </Link>
  )
}
