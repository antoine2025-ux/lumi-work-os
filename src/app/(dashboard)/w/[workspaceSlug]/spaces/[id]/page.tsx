"use client"

import { use, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import {
  Loader2,
  Folder,
  ChevronRight,
  Globe,
  Lock,
  User,
  Target,
  FileText,
  ArrowLeft,
  Clock,
  Filter,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { type SpaceCardData } from "@/components/spaces/space-card"
import { QuickCreatePageDialog } from "@/components/spaces/quick-create-page-dialog"
import { CreateFolderDialog } from "@/components/spaces/create-folder-dialog"

interface SpaceMember {
  id: string
  role: "OWNER" | "EDITOR" | "VIEWER"
  user: { id: string; name: string | null; image: string | null; email: string }
}

interface SpaceProject {
  id: string
  name: string
  status: string
  updatedAt: string
}

interface SpaceWikiPage {
  id: string
  title: string
  slug: string
  updatedAt: string
}

interface SpaceDetail extends SpaceCardData {
  parentId: string | null
  parent: { id: string; name: string } | null
  children: (SpaceCardData & { updatedAt: string })[]
  members: SpaceMember[]
  projects: SpaceProject[]
  wikiPages: SpaceWikiPage[]
}

type ContentItem =
  | { type: "project"; id: string; name: string; status: string; updatedAt: string }
  | { type: "page"; id: string; name: string; slug: string; updatedAt: string }
  | { type: "space"; id: string; name: string; color: string | null; updatedAt: string; _count: SpaceCardData["_count"] }

function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function VisibilityIcon({ visibility }: { visibility: SpaceDetail["visibility"] }) {
  if (visibility === "PERSONAL") return <User className="w-4 h-4" />
  if (visibility === "PRIVATE") return <Lock className="w-4 h-4" />
  return <Globe className="w-4 h-4" />
}

function VisibilityLabel({ visibility }: { visibility: SpaceDetail["visibility"] }) {
  if (visibility === "PERSONAL") return "Personal"
  if (visibility === "PRIVATE") return "Private"
  return "Public"
}

function ContentItemRow({ item, workspaceSlug }: { item: ContentItem; workspaceSlug: string }) {
  const href =
    item.type === "project"
      ? `/w/${workspaceSlug}/projects/${item.id}`
      : item.type === "page"
        ? `/wiki/${item.slug}`
        : `/w/${workspaceSlug}/spaces/${item.id}`

  const icon =
    item.type === "project" ? (
      <Target className="w-4 h-4 text-blue-500" />
    ) : item.type === "page" ? (
      <FileText className="w-4 h-4 text-green-500" />
    ) : (
      <Folder
        className="w-4 h-4"
        style={{ color: item.type === "space" ? (item.color ?? "#3b82f6") : undefined }}
      />
    )

  const typeBadge =
    item.type === "project" ? (
      <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
        Project
      </Badge>
    ) : item.type === "page" ? (
      <Badge variant="outline" className="text-xs text-green-600 border-green-200">
        Page
      </Badge>
    ) : (
      <Badge variant="outline" className="text-xs">
        Folder
      </Badge>
    )

  return (
    <Link href={href}>
      <div className="flex items-center gap-3 px-4 py-3 hover:shadow-sm transition-all rounded-lg group">
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {item.name}
          </p>
        </div>
        {typeBadge}
        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
          <Clock className="w-3 h-3" />
          {relativeTime(item.updatedAt)}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
    </Link>
  )
}

export default function SpaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const urlParams = useParams()
  const router = useRouter()
  const workspaceSlug = urlParams.workspaceSlug as string
  const queryClient = useQueryClient()
  const [createPageOpen, setCreatePageOpen] = useState(false)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [contentFilter, setContentFilter] = useState<"all" | "project" | "page" | "space">("all")
  const [filterExpanded, setFilterExpanded] = useState(false)

  const { data: space, isLoading, isError } = useQuery<SpaceDetail>({
    queryKey: ["spaces", id],
    queryFn: async () => {
      const res = await fetch(`/api/spaces/${id}`)
      if (res.status === 404) throw new Error("not-found")
      if (!res.ok) throw new Error("Failed to load space")
      return res.json()
    },
  })

  const contentItems = useMemo<ContentItem[]>(() => {
    if (!space) return []
    const items: ContentItem[] = [
      ...(space.projects ?? []).map((p) => ({
        type: "project" as const,
        id: p.id,
        name: p.name,
        status: p.status,
        updatedAt: p.updatedAt,
      })),
      ...(space.wikiPages ?? []).map((w) => ({
        type: "page" as const,
        id: w.id,
        name: w.title,
        slug: w.slug,
        updatedAt: w.updatedAt,
      })),
      ...(space.children ?? []).map((c) => ({
        type: "space" as const,
        id: c.id,
        name: c.name,
        color: c.color,
        updatedAt: c.updatedAt,
        _count: c._count,
      })),
    ]
    return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [space])

  const filteredContentItems = useMemo(() => {
    if (contentFilter === "all") return contentItems
    return contentItems.filter((item) => item.type === contentFilter)
  }, [contentItems, contentFilter])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !space) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground mb-4">Space not found or not accessible.</p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go back
          </Button>
        </Card>
      </div>
    )
  }

  const accent = space.color ?? "#3b82f6"

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href={`/w/${workspaceSlug}/spaces/home`} className="hover:text-foreground transition-colors">
          Spaces
        </Link>
        {space.parent && (
          <>
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
            <Link
              href={`/w/${workspaceSlug}/spaces/${space.parent.id}`}
              className="hover:text-foreground transition-colors"
            >
              {space.parent.name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-foreground font-medium">{space.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${accent}20` }}
          >
            <Folder className="w-6 h-6" style={{ color: accent }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{space.name}</h1>
            {space.description && (
              <p className="text-muted-foreground text-sm mt-0.5">{space.description}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={space.isPersonal ? "secondary" : "outline"} className="gap-1 text-xs">
                <VisibilityIcon visibility={space.visibility} />
                <VisibilityLabel visibility={space.visibility} />
              </Badge>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateFolderOpen(true)}
          >
            <Folder className="w-4 h-4 mr-1.5" />
            New Folder
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/w/${workspaceSlug}/projects/new?spaceId=${space.id}`)}
          >
            <Target className="w-4 h-4 mr-1.5" />
            New Project
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreatePageOpen(true)}
          >
            <FileText className="w-4 h-4 mr-1.5" />
            New Page
          </Button>
        </div>
      </div>

      {/* Unified content list */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Content</h2>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterExpanded(!filterExpanded)}
              className="text-xs"
            >
              <Filter className="w-3 h-3 mr-1.5" />
              {contentFilter === "all" ? "All" : contentFilter === "project" ? "Projects" : contentFilter === "page" ? "Documents" : "Folders"}
            </Button>
            {filterExpanded && (
              <div className="absolute right-0 top-full mt-1 bg-card border rounded-lg shadow-lg p-1 z-10 min-w-[140px]">
                <Button
                  variant={contentFilter === "all" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setContentFilter("all")
                    setFilterExpanded(false)
                  }}
                  className="w-full justify-start text-xs"
                >
                  All
                </Button>
                <Button
                  variant={contentFilter === "project" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setContentFilter("project")
                    setFilterExpanded(false)
                  }}
                  className="w-full justify-start text-xs"
                >
                  <Target className="w-3 h-3 mr-1.5" />
                  Projects
                </Button>
                <Button
                  variant={contentFilter === "page" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setContentFilter("page")
                    setFilterExpanded(false)
                  }}
                  className="w-full justify-start text-xs"
                >
                  <FileText className="w-3 h-3 mr-1.5" />
                  Documents
                </Button>
                <Button
                  variant={contentFilter === "space" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setContentFilter("space")
                    setFilterExpanded(false)
                  }}
                  className="w-full justify-start text-xs"
                >
                  <Folder className="w-3 h-3 mr-1.5" />
                  Folders
                </Button>
              </div>
            )}
          </div>
        </div>
        {filteredContentItems.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {contentItems.length === 0 
                ? "No content yet. Add a project or wiki page to get started."
                : `No ${contentFilter === "all" ? "content" : contentFilter === "project" ? "projects" : contentFilter === "page" ? "documents" : "folders"} found.`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredContentItems.map((item) => (
              <ContentItemRow key={`${item.type}-${item.id}`} item={item} workspaceSlug={workspaceSlug} />
            ))}
          </div>
        )}
      </section>

      {/* Members (only shown for PRIVATE spaces) */}
      {space.visibility === "PRIVATE" && space.members.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3">Members</h2>
          <Card>
            <ul className="divide-y">
              {space.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    {m.user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.user.image}
                        alt={m.user.name ?? ""}
                        className="w-7 h-7 rounded-full"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {(m.user.name ?? m.user.email)[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{m.user.name ?? m.user.email}</p>
                      <p className="text-xs text-muted-foreground">{m.user.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {m.role.toLowerCase()}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <QuickCreatePageDialog
        open={createPageOpen}
        onOpenChange={setCreatePageOpen}
        spaceId={space.id}
        spaceName={space.name}
      />

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        parentSpaceId={space.id}
        parentSpaceName={space.name}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["spaces", id] })}
      />
    </div>
  )
}
