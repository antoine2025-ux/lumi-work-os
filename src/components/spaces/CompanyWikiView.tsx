"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import {
  Globe,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  Loader2,
  ChevronRight,
  ChevronDown,
  FolderPlus,
} from "lucide-react"
import { CreateSectionDialog } from "./CreateSectionDialog"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { ErrorState } from "@/components/ui/error-state"
import { WikiPageSkeleton } from "@/components/ui/skeletons"
import { EmptyState } from "@/components/ui/empty-state"

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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
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

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-5 h-5" />
            <h1 className="text-2xl font-semibold">Company Wiki</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Company-wide documentation and knowledge base
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateSectionOpen(true)}
          >
            <FolderPlus className="w-4 h-4 mr-1.5" />
            New Section
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => createPageDirectly(companyWikiSpaceId)}
            disabled={isCreatingPage || !companyWikiSpaceId}
          >
            {isCreatingPage ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-1.5" />
            )}
            New Page
          </Button>
        </div>
      </div>

      {/* Sections (expandable folders) */}
      <section className="mb-8">
        <h2 className="text-xs font-medium text-muted-foreground mb-4 flex items-center gap-2 uppercase tracking-wider">
          <Folder className="w-4 h-4" />
          Sections
        </h2>

        {folders.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Folder className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">No sections yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create sections to organize your wiki pages into topics.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateSectionOpen(true)}
            >
              <FolderPlus className="w-4 h-4 mr-1.5" />
              Create First Section
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {folders.map((folder) => {
              const isExpanded = expandedSections.has(folder.id)
              const pageCount = folder._count.children

              return (
                <div
                  key={folder.id}
                  className="rounded-lg border bg-card overflow-hidden"
                >
                  {/* Section header — click body to expand, click title to navigate */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSection(folder.id)}
                  >
                    <button
                      className="flex-shrink-0"
                      aria-label={isExpanded ? "Collapse section" : "Expand section"}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>

                    {isExpanded ? (
                      <FolderOpen className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    ) : (
                      <Folder className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/wiki/${folder.slug}`}
                        className="font-medium hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {folder.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {pageCount} {pageCount === 1 ? "page" : "pages"}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation()
                        createPageDirectly(companyWikiSpaceId, folder.id)
                      }}
                      disabled={isCreatingPage}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Add Page</span>
                    </Button>
                  </div>

                  {/* Expanded child pages */}
                  {isExpanded && (
                    <div className="border-t bg-muted/30">
                      {folder.children.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <p className="text-sm text-muted-foreground mb-3">
                            This section is empty.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => createPageDirectly(companyWikiSpaceId, folder.id)}
                            disabled={isCreatingPage}
                          >
                            <Plus className="w-4 h-4 mr-1.5" />
                            Add a page
                          </Button>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {folder.children.map((child) => (
                            <Link
                              key={child.id}
                              href={`/wiki/${child.slug}`}
                              className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="truncate text-sm">
                                  {child.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0 ml-4">
                                <span className="hidden sm:inline">
                                  {child.createdBy?.name ?? "Unknown"}
                                </span>
                                <span>
                                  {formatDistanceToNow(new Date(child.updatedAt), {
                                    addSuffix: true,
                                  })}
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Recent Updates — activity feed across all sections */}
      <section>
        <h2 className="text-xs font-medium text-muted-foreground mb-4 flex items-center gap-2 uppercase tracking-wider">
          <FileText className="w-4 h-4" />
          Recent Updates
        </h2>
        <div className="space-y-1">
          {recentPages.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="Start documenting"
              description="Create your first wiki page to share knowledge with your team."
              action={{
                label: "Create Page",
                onClick: () => createPageDirectly(companyWikiSpaceId),
              }}
            />
          ) : (
            recentPages.map((page) => (
              <Link
                key={page.id}
                href={`/wiki/${page.slug}`}
                className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{page.title}</span>
                  {page.parent && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                      in {page.parent.title}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
                  <span className="hidden sm:inline">
                    {page.createdBy?.name ?? "Unknown"}
                  </span>
                  <span>
                    {formatDistanceToNow(new Date(page.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </Link>
            ))
          )}
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
