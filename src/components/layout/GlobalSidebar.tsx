"use client"

import { useState, useEffect, useCallback } from "react"
import { usePathname, useParams } from "next/navigation"
import Link from "next/link"
import {
  User,
  Folder,
  FileText,
  ChevronRight,
  Plus,
  Search,
  CheckSquare,
  Star,
  BookOpen,
  Code,
  Calendar,
  Palette,
  Rocket,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreateSpaceDialog } from "@/components/spaces/create-space-dialog"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useWorkspace } from "@/lib/workspace-context"
import { useUserStatusContext } from "@/providers/user-status-provider"
import { useSidebarPages } from "@/hooks/use-sidebar-pages"
import { useActivePageStore } from "@/lib/stores/use-active-page-store"
import type { SpaceCardData } from "@/components/spaces/space-card"

const STORAGE_KEY_PREFIX = "sidebar-expanded"

interface WikiFolder {
  id: string
  title: string
  slug: string
  excerpt: string | null
  _count: { children: number }
}

async function fetchSpaces(): Promise<{ spaces: SpaceCardData[] }> {
  const res = await fetch("/api/spaces")
  if (!res.ok) throw new Error("Failed to load spaces")
  return res.json()
}

async function fetchCompanyWiki(): Promise<{ folders: WikiFolder[] }> {
  const res = await fetch("/api/wiki/company-wiki")
  if (!res.ok) throw new Error("Failed to load company wiki")
  const data = await res.json()
  return { folders: data.folders ?? [] }
}

function getWikiSectionIcon(folder: { title: string; slug: string }): React.ComponentType<{ className?: string }> {
  const t = `${folder.title} ${folder.slug}`.toLowerCase()
  if (t.includes("handbook")) return BookOpen
  if (t.includes("engineering") || t.includes("engineer")) return Code
  if (t.includes("spec")) return FileText
  if (t.includes("meeting") || t.includes("notes")) return Calendar
  if (t.includes("design")) return Palette
  if (t.includes("go-to-market") || t.includes("gtm") || t.includes("marketing")) return Rocket
  return Folder
}

function useInvalidateSpaces() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ["spaces"] })
}

interface SpaceDetail {
  projects: { id: string; name: string; status: string }[]
  wikiPages: { id: string; title: string; slug: string }[]
  children: { id: string; name: string; slug: string | null }[]
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
  const count = (space as { _count?: { projects?: number; wikiPages?: number; children?: number } })._count
  const hasExpand =
    (count?.projects ?? 0) > 0 ||
    (count?.wikiPages ?? 0) > 0 ||
    (count?.children ?? 0) > 0

  const { data: detail } = useQuery<SpaceDetail>({
    queryKey: ["space", space.id],
    queryFn: async () => {
      const r = await fetch(`/api/spaces/${space.id}`)
      if (!r.ok) throw new Error("Failed to fetch space")
      return r.json()
    },
    enabled: isExpanded && hasExpand,
    staleTime: 60_000,
  })

  const isActive = currentSpaceId === space.id
  const projects = detail?.projects ?? []
  const pages = detail?.wikiPages ?? []
  const children = detail?.children ?? space.children ?? []

  return (
    <div>
      <div
        className={cn(
          "flex items-center justify-between px-3 py-1.5 mx-2 rounded-md text-base transition-colors",
          isActive
            ? "bg-accent/70 text-foreground font-medium"
            : "text-foreground/70 hover:bg-accent/50 hover:text-foreground"
        )}
      >
        <Link
          href={`${baseHref}/spaces/${space.id}`}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <Folder className={cn("w-[14px] h-[14px] flex-shrink-0", !isActive && "text-foreground/50")} />
          <span className="truncate">{space.name}</span>
        </Link>
        {hasExpand && (
          <button
            type="button"
            onClick={onToggle}
            className="p-0.5 rounded hover:bg-muted/80 flex-shrink-0"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <ChevronRight
              className={cn("w-3 h-3 transition-transform duration-200", isExpanded && "rotate-90")}
            />
          </button>
        )}
      </div>
      {isExpanded && (
        <div className="ml-6 mt-1 space-y-1">
          {projects.map((project) => {
            const isAtRisk =
              project.status?.toLowerCase() === "at_risk" ||
              project.status?.toLowerCase() === "at risk"
            const isInactive =
              project.status?.toLowerCase() === "inactive" ||
              project.status?.toLowerCase() === "completed"
            const dotColor = isInactive
              ? "bg-muted-foreground"
              : isAtRisk
                ? "bg-amber-500"
                : "bg-green-500"
            return (
              <Link
                key={project.id}
                href={`${baseHref}/projects/${project.id}`}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 mx-2 rounded-md text-base text-foreground/70 hover:bg-accent/50 hover:text-foreground pl-8"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColor)} aria-hidden />
                <span className="truncate">{project.name}</span>
              </Link>
            )
          })}
          {pages.map((page) => (
            <Link
              key={page.id}
              href={`/wiki/${page.slug}`}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 mx-2 rounded-md text-base text-foreground/70 hover:bg-accent/50 hover:text-foreground pl-8",
                pathname?.includes(`/wiki/${page.slug}`) && "text-primary font-medium bg-accent/70"
              )}
            >
              <FileText className={cn("w-[14px] h-[14px] flex-shrink-0", !pathname?.includes(`/wiki/${page.slug}`) && "text-foreground/50")} />
              <span className="truncate">{getPageTitle(page)}</span>
            </Link>
          ))}
          {children.map((child) => {
            const isChildActive = currentSpaceId === child.id
            return (
              <Link
                key={child.id}
                href={`${baseHref}/spaces/${child.id}`}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 mx-2 rounded-md text-base text-foreground/70 hover:bg-accent/50 hover:text-foreground pl-8",
                  isChildActive && "text-primary font-medium bg-accent/70"
                )}
              >
                <Folder className={cn("w-[14px] h-[14px] flex-shrink-0", !isChildActive && "text-foreground/50")} />
                <span className="truncate">{child.name}</span>
              </Link>
            )
          })}
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
    templates: false,
    teamSpaces: false, // collapsed by default
    companyWiki: false, // collapsed by default
  })
  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>({})

  // Hydrate expand state from localStorage when workspaceId is available
  useEffect(() => {
    if (!workspaceId) return
    const { sections, spaces } = loadExpandedFromStorage(workspaceId)
    setExpandedSections((prev) => ({
      ...prev,
      personal: sections.personal ?? prev.personal,
      templates: sections.templates ?? prev.templates,
      teamSpaces: sections.teamSpaces ?? prev.teamSpaces,
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
      <aside className="w-[240px] flex-shrink-0 border-r border-border bg-card h-full overflow-y-auto">
        {/* Search */}
        <div className="px-3 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 bg-muted border-border rounded-md text-base"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        ) : (
          <nav className="flex-1 overflow-y-auto py-3">
            {/* MY SPACE */}
            <div className="mb-2">
              <h3 className="text-sm font-medium text-muted-foreground/60 uppercase tracking-widest px-3 mb-1.5">
                MY SPACE
              </h3>
              <div
                className={cn(
                  "flex items-center justify-between px-3 py-1.5 mx-2 rounded-md text-base transition-colors",
                  isPersonalActive ? "bg-accent/70" : "hover:bg-accent/50"
                )}
              >
                <Link
                  href={`${baseHref}/spaces/home`}
                  className={cn(
                    "flex items-center gap-2 flex-1 min-w-0",
                    isPersonalActive ? "text-foreground font-medium" : "text-foreground/70 hover:text-foreground"
                  )}
                >
                  <User className={cn("w-[14px] h-[14px] shrink-0", isPersonalActive ? "text-primary" : "text-foreground/50")} />
                  <span className="truncate">Personal</span>
                </Link>
                {personalPages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleSection("personal")}
                    className="p-0.5 rounded hover:bg-accent/50 flex-shrink-0"
                    aria-label={expandedSections.personal ? "Collapse" : "Expand"}
                  >
                    <ChevronRight
                      className={cn("w-3 h-3 transition-transform duration-200", expandedSections.personal && "rotate-90")}
                    />
                  </button>
                )}
              </div>
              {expandedSections.personal && (
                <div className="ml-6 mt-1 space-y-1">
                  {personalPages.map((page) => (
                      <Link
                        key={page.id}
                        href={`/wiki/${page.slug}`}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 mx-2 rounded-md text-base transition-colors pl-8",
                          pathname?.includes(`/wiki/${page.slug}`)
                            ? "bg-accent/70 text-foreground font-medium"
                            : "text-foreground/70 hover:bg-accent/50 hover:text-foreground"
                        )}
                      >
                        <FileText className={cn("w-[14px] h-[14px] shrink-0", !pathname?.includes(`/wiki/${page.slug}`) && "text-foreground/50")} />
                        <span className="truncate">{getPageTitle(page)}</span>
                      </Link>
                    ))}
                </div>
              )}
            </div>

            {/* MY STUFF */}
            <div className="mb-2">
              <h3 className="text-sm font-medium text-muted-foreground/60 uppercase tracking-widest px-3 mb-1.5">
                MY STUFF
              </h3>
              <ul className="space-y-0.5">
                <li>
                  <Link
                    href={`${baseHref}/my-tasks`}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 mx-2 text-base rounded-md transition-colors",
                      isMyTasksActive
                        ? "bg-accent/70 text-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <CheckSquare className="w-[14px] h-[14px] shrink-0" />
                    <span className="truncate">To-do List</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="flex items-center gap-2 px-3 py-1.5 mx-2 text-base rounded-md transition-colors text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  >
                    <Star className="w-[14px] h-[14px] shrink-0" />
                    <span className="truncate">Favorites</span>
                  </Link>
                </li>
              </ul>
            </div>

            <div className="border-b border-border my-2" />

            {/* TEAM SPACES — collapsed by default */}
            <div className="mb-2">
              <div className="w-full flex items-center justify-between px-3 py-1.5">
                <Link
                  href={`${baseHref}/spaces/team`}
                  className={cn(
                    "text-sm font-medium uppercase tracking-widest transition-colors rounded-md",
                    pathname?.endsWith("/spaces/team")
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground/60 hover:text-foreground"
                  )}
                >
                  TEAM SPACES
                </Link>
                <button
                  type="button"
                  onClick={() => toggleSection("teamSpaces")}
                  className="p-0.5 rounded hover:bg-accent/50 flex-shrink-0"
                  aria-label={expandedSections.teamSpaces ? "Collapse" : "Expand"}
                >
                  <ChevronRight
                    className={cn("w-3 h-3 transition-transform duration-200", expandedSections.teamSpaces && "rotate-90")}
                  />
                </button>
              </div>
              {expandedSections.teamSpaces && (
              <div className="space-y-0.5 mt-1">
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
                  className="w-full justify-start gap-2 px-3 py-1.5 h-auto text-muted-foreground/60 hover:text-muted-foreground ml-2"
                >
                  <Plus className="h-5 w-5" />
                  New Space
                </Button>
              </div>
            )}
            </div>

            <div className="border-b border-border my-2" />

            {/* COMPANY WIKI — same pattern as TEAM SPACES */}
            <div className="mb-2">
              <button
                type="button"
                onClick={() => toggleSection("companyWiki")}
                className={cn(
                  "w-full flex items-center justify-between text-sm font-medium text-muted-foreground/60 uppercase tracking-widest px-3 py-1.5 hover:text-foreground transition-colors rounded-md",
                  isWikiActive && "text-foreground font-semibold"
                )}
              >
                <span>COMPANY WIKI</span>
                <ChevronRight
                  className={cn("w-3 h-3 transition-transform duration-200", expandedSections.companyWiki && "rotate-90")}
                />
              </button>
              {expandedSections.companyWiki && (
                <div className="space-y-0.5 mt-1">
                  <Link
                    href="/wiki/home"
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 mx-2 rounded-md text-base transition-colors",
                      isWikiActive ? "bg-accent/70 text-foreground font-medium" : "text-foreground/70 hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <FileText className={cn("w-[14px] h-[14px] shrink-0", isWikiActive ? "text-primary" : "text-foreground/50")} />
                    <span className="truncate">Company Wiki</span>
                  </Link>
                  <Link
                    href="/wiki"
                    className="flex items-center gap-2 px-3 py-1.5 mx-2 rounded-md text-base transition-colors text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  >
                    <FileText className="w-[14px] h-[14px] shrink-0 text-foreground/50" />
                    <span className="truncate">Templates</span>
                  </Link>
                </div>
              )}
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
