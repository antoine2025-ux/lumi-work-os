"use client"

import { useState } from "react"
import { usePathname, useParams } from "next/navigation"
import Link from "next/link"
import {
  User,
  Folder,
  Globe,
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  CheckSquare,
  Star,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreateSpaceDialog } from "@/components/spaces/create-space-dialog"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useWorkspace } from "@/lib/workspace-context"
import { useCompanyWikiPages } from "@/hooks/use-wiki-pages"
import type { SpaceCardData } from "@/components/spaces/space-card"

async function fetchSpaces(): Promise<{ spaces: SpaceCardData[] }> {
  const res = await fetch("/api/spaces")
  if (!res.ok) throw new Error("Failed to load spaces")
  return res.json()
}

function useInvalidateSpaces() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ["spaces"] })
}

export function GlobalSidebar() {
  const pathname = usePathname()
  const params = useParams()
  const workspaceSlug = params?.workspaceSlug as string | undefined
  const { currentWorkspace } = useWorkspace()
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false)
  const invalidateSpaces = useInvalidateSpaces()

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "company-wiki": false,
    templates: false,
  })
  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>({})

  const toggleSpaceExpand = (spaceId: string) => {
    setExpandedSpaces((prev) => ({ ...prev, [spaceId]: !prev[spaceId] }))
  }

  const slug = workspaceSlug ?? currentWorkspace?.slug
  const baseHref = slug ? `/w/${slug}` : ""

  const { data, isLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: fetchSpaces,
    staleTime: 30_000,
  })

  const { data: companyWikiPages = [] } = useCompanyWikiPages(15)

  const spaces = data?.spaces ?? []
  const teamSpaces = spaces.filter(
    (s) =>
      !s.isPersonal &&
      (s as { type?: string }).type !== "WIKI" &&
      !(s as { parentId?: string | null }).parentId &&
      (s as { slug?: string | null }).slug !== "company-wiki"
  )

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const isPersonalActive = pathname?.endsWith("/spaces/home") ?? false
  const spaceIdMatch = pathname?.match(/\/spaces\/([^/]+)/)
  const currentSpaceId =
    spaceIdMatch && spaceIdMatch[1] !== "home" ? spaceIdMatch[1] : null
  const isWikiActive = pathname?.includes("/wiki")
  const isMyTasksActive = pathname?.includes("/my-tasks") ?? false

  return (
    <>
      <aside className="w-64 border-r flex flex-col h-full bg-card flex-shrink-0">
        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 bg-muted/50 rounded-lg text-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        ) : (
          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* MY SPACE */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                MY SPACE
              </h3>
              <Link
                href={`${baseHref}/spaces/home`}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors",
                  isPersonalActive
                    ? "bg-muted font-medium border-l-2 border-amber-500 -ml-[2px] pl-[10px]"
                    : "hover:bg-muted/50"
                )}
              >
                <User className="w-4 h-4" />
                Personal
              </Link>
            </div>

            {/* TEAM SPACES */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                TEAM SPACES
              </h3>
              <div className="space-y-1">
                {teamSpaces.map((space) => {
                  const isActive = currentSpaceId === space.id
                  const children = (space as { children?: { id: string; name: string; slug: string | null }[] })
                    .children ?? []
                  const hasChildren = children.length > 0
                  const isExpanded = expandedSpaces[space.id] ?? false

                  return (
                    <div key={space.id}>
                      <div className="flex items-center">
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggleSpaceExpand(space.id)}
                            className="p-0.5 -ml-0.5 rounded hover:bg-muted/80 flex-shrink-0"
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <span className="w-5 flex-shrink-0" />
                        )}
                        <Link
                          href={`${baseHref}/spaces/${space.id}`}
                          className={cn(
                            "flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors min-w-0",
                            isActive
                              ? "bg-muted font-medium border-l-2 border-amber-500 -ml-[2px] pl-[10px]"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <Folder className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{space.name}</span>
                        </Link>
                      </div>
                      {isExpanded && hasChildren && (
                        <div className="ml-6 mt-1 space-y-1">
                          {children.map((child) => {
                            const isChildActive = currentSpaceId === child.id
                            return (
                              <Link
                                key={child.id}
                                href={`${baseHref}/spaces/${child.id}`}
                                className={cn(
                                  "flex items-center gap-2 px-2 py-1 rounded text-sm text-muted-foreground hover:text-foreground",
                                  isChildActive && "text-amber-500 font-medium"
                                )}
                              >
                                <Folder className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{child.name}</span>
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCreateSpaceOpen(true)}
                  className="w-full justify-start gap-2 px-2 py-1.5 h-auto text-muted-foreground hover:text-foreground ml-5"
                >
                  <Plus className="w-4 h-4" />
                  New Space
                </Button>
              </div>
            </div>

            {/* SHARED */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                SHARED
              </h3>
              <div className="space-y-1">
                {/* Company Wiki - Clickable link + expand for pages */}
                <div>
                  <div
                    className={cn(
                      "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors",
                      isWikiActive
                        ? "bg-muted font-medium border-l-2 border-amber-500 -ml-[2px] pl-[10px]"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSection("company-wiki")}
                      className="p-0.5 -ml-0.5 rounded hover:bg-muted/80"
                      aria-label="Toggle company wiki pages"
                    >
                      {expandedSections["company-wiki"] ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    <Link
                      href="/wiki/home"
                      className="flex items-center gap-2 flex-1 min-w-0"
                    >
                      <Globe className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">Company Wiki</span>
                    </Link>
                  </div>
                  {expandedSections["company-wiki"] &&
                    companyWikiPages.length > 0 && (
                    <div className="ml-6 mt-1 space-y-1">
                      {companyWikiPages.map((page: { id: string; title: string; slug: string }) => (
                        <Link
                          key={page.id}
                          href={`/wiki/${page.slug}`}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1 rounded text-sm text-muted-foreground hover:text-foreground",
                            pathname?.includes(`/wiki/${page.slug}`) &&
                              "text-amber-500 font-medium"
                          )}
                        >
                          <FileText className="w-3 h-3" />
                          <span className="truncate">{page.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Templates - Expandable */}
                <button
                  type="button"
                  onClick={() => toggleSection("templates")}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm text-left hover:bg-muted/50 transition-colors"
                >
                  {expandedSections.templates ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <FileText className="w-4 h-4" />
                  Templates
                </button>
              </div>
            </div>

            {/* MY STUFF */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                MY STUFF
              </h3>
              <div className="space-y-1">
                <Link
                  href={`${baseHref}/my-tasks`}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors",
                    isMyTasksActive
                      ? "bg-muted font-medium border-l-2 border-amber-500 -ml-[2px] pl-[10px]"
                      : "hover:bg-muted/50"
                  )}
                >
                  <CheckSquare className="w-4 h-4" />
                  To-do List
                </Link>
                <Link
                  href="#"
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-muted/50 transition-colors"
                >
                  <Star className="w-4 h-4" />
                  Favorites
                </Link>
              </div>
            </div>
          </nav>
        )}
      </aside>

      <CreateSpaceDialog
        open={createSpaceOpen}
        onClose={() => setCreateSpaceOpen(false)}
        onCreated={() => {
          invalidateSpaces()
          setCreateSpaceOpen(false)
        }}
      />
    </>
  )
}
