"use client"

import { useState, useEffect, useCallback } from "react"
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
import { useUserStatusContext } from "@/providers/user-status-provider"
import { useCompanyWikiPages } from "@/hooks/use-wiki-pages"
import { useSidebarPages } from "@/hooks/use-sidebar-pages"
import { useActivePageStore } from "@/lib/stores/use-active-page-store"
import type { SpaceCardData } from "@/components/spaces/space-card"

const STORAGE_KEY_PREFIX = "sidebar-expanded"

async function fetchSpaces(): Promise<{ spaces: SpaceCardData[] }> {
  const res = await fetch("/api/spaces")
  if (!res.ok) throw new Error("Failed to load spaces")
  return res.json()
}

function useInvalidateSpaces() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ["spaces"] })
}

function TeamSpaceItem({
  space,
  baseHref,
  currentSpaceId,
  isExpanded,
  onToggle,
  pathname,
  getPageTitle,
}: {
  space: SpaceCardData & { children?: { id: string; name: string; slug: string | null }[] }
  baseHref: string
  currentSpaceId: string | null
  isExpanded: boolean
  onToggle: () => void
  pathname: string | null
  getPageTitle: (page: { id: string; title: string }) => string
}) {
  const children = space.children ?? []
  const hasChildren = children.length > 0
  const hasExpand = hasChildren || true
  const { data: spacePages = [] } = useSidebarPages(isExpanded ? space.id : null, 20)
  const isActive = currentSpaceId === space.id

  return (
    <div>
      <div className="flex items-center">
        {hasExpand ? (
          <button
            type="button"
            onClick={onToggle}
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
      {isExpanded && (
        <div className="ml-6 mt-1 space-y-1">
          {hasChildren &&
            children.map((child) => {
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
          {spacePages.map((page) => (
            <Link
              key={page.id}
              href={`/wiki/${page.slug}`}
              className={cn(
                "flex items-center gap-2 px-2 py-1 rounded text-sm text-muted-foreground hover:text-foreground pl-6",
                pathname?.includes(`/wiki/${page.slug}`) && "text-amber-500 font-medium bg-muted/50"
              )}
            >
              <FileText className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{getPageTitle(page)}</span>
            </Link>
          ))}
          {!hasChildren && spacePages.length === 0 && (
            <p className="text-xs text-muted-foreground py-1 pl-2">No pages yet</p>
          )}
        </div>
      )}
    </div>
  )
}

function loadExpandedFromStorage(workspaceId: string | null): { sections: Record<string, boolean>; spaces: Record<string, boolean> } {
  if (typeof window === "undefined" || !workspaceId) return { sections: {}, spaces: {} }
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}-${workspaceId}`)
    if (!raw) return { sections: {}, spaces: {} }
    const parsed = JSON.parse(raw) as { sections?: Record<string, boolean>; spaces?: Record<string, boolean> }
    return {
      sections: parsed.sections ?? {},
      spaces: parsed.spaces ?? {},
    }
  } catch {
    return { sections: {}, spaces: {} }
  }
}

function saveExpandedToStorage(workspaceId: string | null, sections: Record<string, boolean>, spaces: Record<string, boolean>) {
  if (typeof window === "undefined" || !workspaceId) return
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}-${workspaceId}`, JSON.stringify({ sections, spaces }))
  } catch {
    // ignore
  }
}

export function GlobalSidebar() {
  const pathname = usePathname()
  const params = useParams()
  const workspaceSlug = params?.workspaceSlug as string | undefined
  const { currentWorkspace } = useWorkspace()
  const { workspaceId } = useUserStatusContext()
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false)
  const invalidateSpaces = useInvalidateSpaces()
  const clearActivePage = useActivePageStore((s) => s.clearActivePage)
  const { activePageId, activePageTitle } = useActivePageStore()

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    personal: false,
    "company-wiki": false,
    templates: false,
  })
  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>({})

  // Hydrate expand state from localStorage when workspaceId is available
  useEffect(() => {
    if (!workspaceId) return
    const { sections, spaces } = loadExpandedFromStorage(workspaceId)
    setExpandedSections((prev) => ({
      ...prev,
      personal: sections.personal ?? prev.personal,
      "company-wiki": sections["company-wiki"] ?? prev["company-wiki"],
      templates: sections.templates ?? prev.templates,
    }))
    setExpandedSpaces((prev) => ({ ...prev, ...spaces }))
  }, [workspaceId])

  // Persist expand state to localStorage
  useEffect(() => {
    saveExpandedToStorage(workspaceId ?? null, expandedSections, expandedSpaces)
  }, [workspaceId, expandedSections, expandedSpaces])

  // Auto-expand on navigation and clear active page when leaving wiki
  useEffect(() => {
    if (!pathname) return
    if (!pathname.includes("/wiki")) {
      clearActivePage()
    }
    if (pathname.endsWith("/spaces/home")) {
      setExpandedSections((s) => ({ ...s, personal: true }))
    } else if (pathname.includes("/wiki")) {
      setExpandedSections((s) => ({ ...s, "company-wiki": true }))
    } else {
      const spaceIdMatch = pathname.match(/\/spaces\/([^/]+)/)
      const spaceId = spaceIdMatch && spaceIdMatch[1] !== "home" ? spaceIdMatch[1] : null
      if (spaceId) {
        setExpandedSpaces((s) => ({ ...s, [spaceId]: true }))
      }
    }
  }, [pathname, clearActivePage])

  const toggleSpaceExpand = useCallback((spaceId: string) => {
    setExpandedSpaces((prev) => ({ ...prev, [spaceId]: !prev[spaceId] }))
  }, [])

  const slug = workspaceSlug ?? currentWorkspace?.slug
  const baseHref = slug ? `/w/${slug}` : ""

  const { data, isLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: fetchSpaces,
    staleTime: 5 * 60 * 1000,
  })

  const { data: companyWikiPages = [] } = useCompanyWikiPages(15)
  const spaces = data?.spaces ?? []
  const personalSpace = spaces.find((s: SpaceCardData) => s.isPersonal) ?? null
  const { data: personalPages = [] } = useSidebarPages(personalSpace?.id ?? null, 20)

  const teamSpaces = spaces.filter(
    (s) =>
      !s.isPersonal &&
      (s as { type?: string }).type !== "WIKI" &&
      !(s as { parentId?: string | null }).parentId &&
      (s as { slug?: string | null }).slug !== "company-wiki"
  )

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const isPersonalActive = pathname?.endsWith("/spaces/home") ?? false
  const spaceIdMatch = pathname?.match(/\/spaces\/([^/]+)/)
  const currentSpaceId =
    spaceIdMatch && spaceIdMatch[1] !== "home" ? spaceIdMatch[1] : null
  const isWikiActive = pathname?.includes("/wiki")
  const isMyTasksActive = pathname?.includes("/my-tasks") ?? false

  const getPageTitle = useCallback(
    (page: { id: string; title: string }) =>
      page.id === activePageId ? activePageTitle : page.title,
    [activePageId, activePageTitle]
  )

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
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => toggleSection("personal")}
                  className="p-0.5 -ml-0.5 rounded hover:bg-muted/80 flex-shrink-0"
                  aria-label={expandedSections.personal ? "Collapse" : "Expand"}
                >
                  {expandedSections.personal ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                <Link
                  href={`${baseHref}/spaces/home`}
                  className={cn(
                    "flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors min-w-0",
                    isPersonalActive
                      ? "bg-muted font-medium border-l-2 border-amber-500 -ml-[2px] pl-[10px]"
                      : "hover:bg-muted/50"
                  )}
                >
                  <User className="w-4 h-4" />
                  Personal
                </Link>
              </div>
              {expandedSections.personal && (
                <div className="ml-6 mt-1 space-y-1">
                  {personalPages.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-1 pl-2">No pages yet</p>
                  ) : (
                    personalPages.map((page) => (
                      <Link
                        key={page.id}
                        href={`/wiki/${page.slug}`}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1 rounded text-sm text-muted-foreground hover:text-foreground pl-6",
                          pathname?.includes(`/wiki/${page.slug}`) && "text-amber-500 font-medium bg-muted/50"
                        )}
                      >
                        <FileText className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{getPageTitle(page)}</span>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* TEAM SPACES */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                TEAM SPACES
              </h3>
              <div className="space-y-1">
                {teamSpaces.map((space) => (
                  <TeamSpaceItem
                    key={space.id}
                    space={space}
                    baseHref={baseHref}
                    currentSpaceId={currentSpaceId}
                    isExpanded={expandedSpaces[space.id] ?? false}
                    onToggle={() => toggleSpaceExpand(space.id)}
                    pathname={pathname}
                    getPageTitle={getPageTitle}
                  />
                ))}
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
                  {expandedSections["company-wiki"] && (
                    <div className="ml-6 mt-1 space-y-1">
                      {companyWikiPages.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-1 pl-2">No pages yet</p>
                      ) : (
                        companyWikiPages.map((page: { id: string; title: string; slug: string }) => (
                          <Link
                            key={page.id}
                            href={`/wiki/${page.slug}`}
                            className={cn(
                              "flex items-center gap-2 px-2 py-1 rounded text-sm text-muted-foreground hover:text-foreground pl-6",
                              pathname?.includes(`/wiki/${page.slug}`) && "text-amber-500 font-medium bg-muted/50"
                            )}
                          >
                            <FileText className="w-3 h-3" />
                            <span className="truncate">{getPageTitle(page)}</span>
                          </Link>
                        ))
                      )}
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
