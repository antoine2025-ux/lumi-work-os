"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import {
  Globe,
  FileText,
  Folder,
  Plus,
  Loader2,
  FolderPlus,
  BookOpen,
  Code,
  Calendar,
  Palette,
  Rocket,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CreateSectionDialog } from "./CreateSectionDialog"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { ErrorState } from "@/components/ui/error-state"
import { WikiPageSkeleton } from "@/components/ui/skeletons"
import { EmptyState } from "@/components/ui/empty-state"

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

function getSectionIcon(
  folder: { title: string; slug: string }
): React.ComponentType<{ className?: string }> {
  const t = `${folder.title} ${folder.slug}`.toLowerCase()
  if (t.includes("handbook")) return BookOpen
  if (t.includes("engineering") || t.includes("engineer")) return Code
  if (t.includes("spec")) return FileText
  if (t.includes("meeting") || t.includes("notes")) return Calendar
  if (t.includes("design")) return Palette
  if (t.includes("go-to-market") || t.includes("gtm") || t.includes("marketing"))
    return Rocket
  return Folder
}

function getInitials(name: string | null): string {
  if (!name) return "?"
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface WikiChildPage {
  id: string
  title: string
  slug: string
  excerpt: string | null
  updatedAt: string
  createdBy: { name: string | null }
}

interface WikiFolder {
  id: string
  title: string
  slug: string
  excerpt: string | null
  order: number
  updatedAt: string
  children: WikiChildPage[]
  _count: { children: number }
}

interface WikiPageItem {
  id: string
  title: string
  slug: string
  excerpt: string | null
  updatedAt: string
  parentId: string | null
  parent: { id: string; title: string; slug: string } | null
  createdBy: { name: string | null }
  _count: { children: number }
}

interface CompanyWikiData {
  companyWikiSpaceId: string
  folders: WikiFolder[]
  recentPages: WikiPageItem[]
}

async function fetchCompanyWiki(): Promise<CompanyWikiData> {
  const res = await fetch("/api/wiki/company-wiki")
  if (!res.ok) throw new Error("Failed to load company wiki")
  return res.json()
}

export function CompanyWikiView() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isCreatingPage, setIsCreatingPage] = useState(false)
  const [createSectionOpen, setCreateSectionOpen] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ["wiki", "company-wiki"],
    queryFn: fetchCompanyWiki,
    staleTime: 60_000,
  })

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["wiki", "company-wiki"] }),
    [queryClient],
  )

  const createPageDirectly = useCallback(
    async (spaceId: string, parentId?: string) => {
      if (!spaceId || isCreatingPage) return
      setIsCreatingPage(true)
      try {
        const body: Record<string, unknown> = {
          title: "Untitled",
          spaceId,
        }
        if (parentId) body.parentId = parentId
        const res = await fetch("/api/wiki/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? "Failed to create page")
        }
        const page = await res.json()
        queryClient.invalidateQueries({ queryKey: ["sidebar-pages"] })
        window.dispatchEvent(new CustomEvent("workspacePagesRefreshed"))
        queryClient.invalidateQueries({ queryKey: ["wiki", "company-wiki"] })
        router.push(`/wiki/${page.slug}?edit=true`)
      } catch {
        setIsCreatingPage(false)
      }
    },
    [isCreatingPage, queryClient, router]
  )

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <WikiPageSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 p-6">
        <ErrorState
          title="Failed to load company wiki"
          description="There was an error loading the wiki. Please try again."
          onRetry={invalidate}
        />
      </div>
    )
  }

  const companyWikiSpaceId = data?.companyWikiSpaceId ?? ""
  const folders = data?.folders ?? []
  const recentPages = data?.recentPages ?? []

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Header — same style as Team Spaces */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Company Wiki</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Spaces / Company Wiki</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghostMuted"
            size="xs"
            onClick={() => setCreateSectionOpen(true)}
          >
            <FolderPlus className="w-3.5 h-3.5 mr-1" />
            New Section
          </Button>
          <Button
            variant="ghostMuted"
            size="xs"
            onClick={() => createPageDirectly(companyWikiSpaceId)}
            disabled={isCreatingPage || !companyWikiSpaceId}
          >
            {isCreatingPage ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5 mr-1" />
            )}
            New Page
          </Button>
        </div>
      </div>

      {/* Sections — category card grid */}
      <section className="mb-6">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
          BROWSE BY CATEGORY
        </h2>

        {folders.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Folder className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">No sections yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create sections to organize your wiki pages into topics.
            </p>
            <Button
              variant="ghostMuted"
              size="xs"
              onClick={() => setCreateSectionOpen(true)}
            >
              <FolderPlus className="w-3.5 h-3.5 mr-1" />
              Create First Section
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {folders.map((folder, index) => {
              const Icon = getSectionIcon(folder)
              const colorClass = SECTION_COLORS[index % SECTION_COLORS.length]
              return (
                <Link
                  key={folder.id}
                  href={`/wiki/${folder.slug}`}
                  className="bg-card/50 hover:bg-card rounded-md p-4 transition-colors group"
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colorClass}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                <h3 className="text-sm font-medium text-foreground group-hover:text-primary">
                  {folder.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {folder.excerpt ?? ""}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {folder._count.children} docs
                </p>
              </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Recent Updates — 2-column layout (always show structure) */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: RECENTLY UPDATED (limit 5) */}
          <div className="lg:col-span-2 max-w-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                RECENTLY UPDATED
              </h2>
              {recentPages.length > 0 && (
                <Link
                  href="/wiki/search"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all →
                </Link>
              )}
            </div>
            {recentPages.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-muted/30 py-8 px-4 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground mb-1">No recent updates</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Create your first wiki page to share knowledge with your team.
                </p>
                <Button
                  variant="ghostMuted"
                  size="xs"
                  onClick={() => createPageDirectly(companyWikiSpaceId)}
                  disabled={isCreatingPage || !companyWikiSpaceId}
                >
                  {isCreatingPage ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 mr-1" />
                  )}
                  Create Page
                </Button>
              </div>
            ) : (
              <div>
                {recentPages.slice(0, 5).map((page) => (
                  <Link
                    key={page.id}
                    href={`/wiki/${page.slug}`}
                    className="flex items-start gap-4 border-b border-border last:border-b-0 py-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate">
                          {page.title}
                        </span>
                        {page.parent && (
                          <span className="text-xs bg-accent text-accent-foreground px-1.5 py-0.5 rounded flex-shrink-0">
                            {page.parent.title}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {page.parent?.title ?? "Uncategorized"} ·{" "}
                        {formatDistanceToNow(new Date(page.updatedAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {page.createdBy?.name ?? "Unknown"}
                      </span>
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px] bg-muted">
                          {getInitials(page.createdBy?.name ?? null)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right: POPULAR THIS MONTH (same pages, sorted by title — view count not available) */}
          <div className="lg:col-span-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
              POPULAR THIS MONTH
            </h2>
            {recentPages.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No pages yet. Create your first page to see it here.
              </p>
            ) : (
              <div className="space-y-3">
                {[...recentPages]
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .slice(0, 5)
                  .map((page, i) => (
                    <Link
                      key={page.id}
                      href={`/wiki/${page.slug}`}
                      className="flex gap-3 items-start group"
                    >
                      <span className="text-sm font-medium text-muted-foreground/30 flex-shrink-0 w-6">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-foreground group-hover:text-primary block truncate">
                          {page.title}
                        </span>
                        <span className="text-xs text-muted-foreground block">
                          {page.parent?.title ?? "Uncategorized"}
                        </span>
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <CreateSectionDialog
        open={createSectionOpen}
        onOpenChange={setCreateSectionOpen}
        spaceId={companyWikiSpaceId}
        onSuccess={invalidate}
      />
    </div>
  )
}
