"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import {
  FileText,
  Folder,
  Plus,
  Loader2,
  BookOpen,
  Code,
  Calendar,
  Palette,
  Rocket,
  List,
  LayoutGrid,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatRelativeTime } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

const SECTION_COLORS = [
  "bg-blue-500/10 text-blue-500",
  "bg-rose-500/10 text-rose-500",
  "bg-emerald-500/10 text-emerald-500",
  "bg-amber-500/10 text-amber-500",
  "bg-violet-500/10 text-violet-500",
  "bg-cyan-500/10 text-cyan-500",
  "bg-orange-500/10 text-orange-500",
  "bg-pink-500/10 text-pink-500",
] as const

function getSectionIcon(section: { title: string; slug: string }): React.ComponentType<{ className?: string }> {
  const t = `${section.title} ${section.slug}`.toLowerCase()
  if (t.includes("handbook")) return BookOpen
  if (t.includes("engineering") || t.includes("engineer")) return Code
  if (t.includes("spec")) return FileText
  if (t.includes("meeting") || t.includes("notes")) return Calendar
  if (t.includes("design")) return Palette
  if (t.includes("go-to-market") || t.includes("gtm") || t.includes("marketing")) return Rocket
  return Folder
}

export interface WikiSectionChild {
  id: string
  title: string
  slug: string
  excerpt?: string | null
  updatedAt: string
  createdAt?: string
  order?: number
  isSection?: boolean
  isPublished?: boolean
  viewCount?: number | null
  createdBy?: { id?: string; name: string | null; image?: string | null } | null
}

export interface WikiSectionPage {
  id: string
  title: string
  slug: string
  excerpt?: string | null
  content?: string
  contentJson?: unknown
  contentFormat?: "JSON" | "HTML"
  spaceId?: string | null
  updatedAt?: string | Date
  children?: WikiSectionChild[]
}

interface WikiSectionViewProps {
  page: WikiSectionPage
}

export function WikiSectionView({ page }: WikiSectionViewProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isCreatingPage, setIsCreatingPage] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [selectedFolder, setSelectedFolder] = useState<string | "all">("all")

  const canCreatePage = !!page.spaceId && !isCreatingPage
  const children = page.children ?? []
  const subSections = children.filter((c) => c.isSection === true)
  const pages = children.filter((c) => c.isSection !== true)
  const hasSubSections = subSections.length > 0

  const createPage = useCallback(async () => {
    if (!canCreatePage) return
    setIsCreatingPage(true)
    try {
      const res = await fetch("/api/wiki/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled",
          spaceId: page.spaceId,
          parentId: page.id,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to create page")
      }
      const newPage = await res.json()
      queryClient.invalidateQueries({ queryKey: ["sidebar-pages"] })
      window.dispatchEvent(new CustomEvent("workspacePagesRefreshed"))
      router.push(`/wiki/${newPage.slug}?edit=true`)
    } catch (err) {
      toast({
        title: "Failed to create page",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      })
      setIsCreatingPage(false)
    }
  }, [canCreatePage, page.spaceId, page.id, queryClient, router, toast])

  const colorIndex = 0
  const colorClass = SECTION_COLORS[colorIndex % SECTION_COLORS.length]
  const SectionIcon = getSectionIcon(page)

  const displayPages =
    selectedFolder === "all"
      ? pages
      : pages.filter((p) => {
          const child = children.find((c) => c.id === p.id)
          return child && "parentId" in child && (child as { parentId?: string }).parentId === selectedFolder
        })

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Section header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <nav className="text-[13px] text-muted-foreground mb-2">
              <Link href="/wiki/home" className="hover:text-foreground transition-colors">
                Wiki
              </Link>
              <span className="mx-1.5">&gt;</span>
              <span className="text-foreground">{page.title}</span>
            </nav>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                <SectionIcon className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">{page.title}</h1>
                {page.excerpt && (
                  <p className="text-[13px] text-muted-foreground mt-0.5">{page.excerpt}</p>
                )}
              </div>
            </div>
          </div>
          {canCreatePage && (
            <Button onClick={createPage} variant="outline" size="sm" className="h-8 shrink-0" disabled={isCreatingPage}>
              {isCreatingPage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1.5" />
                  New Page
                </>
              )}
            </Button>
          )}
        </div>
      </header>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-border flex items-center justify-between">
        <span className="text-[13px] text-muted-foreground">
          {children.length} document{children.length !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 px-2">
            Sort
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 ${viewMode === "list" ? "bg-muted" : ""}`}
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 ${viewMode === "grid" ? "bg-muted" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Document list */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        {hasSubSections && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setSelectedFolder("all")}
              className={`px-3 py-1.5 text-[13px] rounded-md border transition-colors ${
                selectedFolder === "all"
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "text-muted-foreground border-border hover:border-primary/30"
              }`}
            >
              All
            </button>
            {subSections.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedFolder(sub.id)}
                className={`px-3 py-1.5 text-[13px] rounded-md border transition-colors ${
                  selectedFolder === sub.id
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "text-muted-foreground border-border hover:border-primary/30"
                }`}
              >
                {sub.title}
              </button>
            ))}
          </div>
        )}

        {children.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-3">No pages in this section yet</p>
            {canCreatePage && (
              <Button onClick={createPage} variant="outline" size="sm" disabled={isCreatingPage}>
                {isCreatingPage ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Page
              </Button>
            )}
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-2 md:grid-cols-3 gap-3" : "space-y-0.5"}>
            {(hasSubSections ? displayPages : children).map((child) => (
              <Link
                key={child.id}
                href={`/wiki/${child.slug}`}
                className={`flex items-center gap-4 p-3 rounded-md hover:bg-accent/30 transition-colors group ${
                  viewMode === "grid" ? "flex-col items-start" : ""
                }`}
              >
                <div className="w-8 h-8 rounded-md bg-muted/50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[13px] font-medium text-foreground group-hover:text-primary truncate">
                    {child.title}
                  </h3>
                  {child.excerpt && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{child.excerpt}</p>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground flex-shrink-0">
                  {formatRelativeTime(child.updatedAt)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
