"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import {
  Loader2,
  Folder,
  ChevronRight,
  FileText,
  Users,
  ArrowLeft,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProjectCard } from "./ProjectCard"
import { QuickCreatePageDialog } from "./quick-create-page-dialog"
import { CreateFolderDialog } from "./create-folder-dialog"
import { formatDistanceToNow } from "date-fns"
import type { SpaceCardData } from "./space-card"

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

interface TeamSpaceViewProps {
  spaceId: string
}

export function TeamSpaceView({ spaceId }: TeamSpaceViewProps) {
  const params = useParams()
  const router = useRouter()
  const workspaceSlug = params.workspaceSlug as string
  const queryClient = useQueryClient()
  const [createPageOpen, setCreatePageOpen] = useState(false)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)

  const baseHref = workspaceSlug ? `/w/${workspaceSlug}` : ""

  const { data: space, isLoading: spaceLoading, isError } = useQuery<SpaceDetail>({
    queryKey: ["spaces", spaceId],
    queryFn: async () => {
      const res = await fetch(`/api/spaces/${spaceId}`)
      if (res.status === 404) throw new Error("not-found")
      if (!res.ok) throw new Error("Failed to load space")
      return res.json()
    },
  })

  const { data: ownProjects } = useQuery({
    queryKey: ["spaces", spaceId, "projects"],
    queryFn: () =>
      fetch(`/api/spaces/${spaceId}/projects`).then((r) => {
        if (!r.ok) throw new Error("Failed to load projects")
        return r.json()
      }),
    enabled: !!space,
  })

  const { data: collaborations } = useQuery({
    queryKey: ["spaces", spaceId, "collaborations"],
    queryFn: () =>
      fetch(`/api/spaces/${spaceId}/collaborations`).then((r) => {
        if (!r.ok) throw new Error("Failed to load collaborations")
        return r.json()
      }),
    enabled: !!space,
  })

  const { data: teamDocs } = useQuery({
    queryKey: ["spaces", spaceId, "docs"],
    queryFn: () =>
      fetch(`/api/spaces/${spaceId}/docs`).then((r) => {
        if (!r.ok) throw new Error("Failed to load docs")
        return r.json()
      }),
    enabled: !!space,
  })

  if (spaceLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !space) {
    return (
      <div className="flex-1 p-6">
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Space not found or not accessible.
          </p>
          <Button variant="outline" onClick={() => router.push(`${baseHref}/spaces/home`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go back
          </Button>
        </Card>
      </div>
    )
  }

  const accent = space.color ?? "#3b82f6"

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
        <Link
          href={`${baseHref}/spaces/home`}
          className="hover:text-foreground transition-colors"
        >
          Spaces
        </Link>
        {space.parent && (
          <>
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
            <Link
              href={`${baseHref}/spaces/${space.parent.id}`}
              className="hover:text-foreground transition-colors"
            >
              {space.parent.name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-foreground font-medium">{space.name}</span>
      </nav>

      {/* Header with actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Folder className="w-5 h-5" style={{ color: accent }} />
            <h1 className="text-2xl font-semibold">{space.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground">Spaces / {space.name}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreatePageOpen(true)}
          >
            New Page
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`${baseHref}/projects/new?spaceId=${space.id}`)}
          >
            New Project
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateFolderOpen(true)}
          >
            <Folder className="w-4 h-4 mr-1.5" />
            New Folder
          </Button>
        </div>
      </div>

      {/* OUR PROJECTS - Owned by this team */}
      <section className="mb-8">
        <h2 className="text-xs font-medium text-muted-foreground mb-4 flex items-center gap-2 uppercase tracking-wider">
          <Folder className="w-4 h-4" />
          Our Projects
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(ownProjects ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-full py-4">
              No projects yet.
            </p>
          ) : (
            (ownProjects ?? []).map((project: { id: string; name: string; status?: string; updatedAt: string; tasks?: { id: string; status: string }[] | undefined }) => (
              <ProjectCard
                key={project.id}
                project={project}
                workspaceSlug={workspaceSlug}
              />
            ))
          )}
        </div>
      </section>

      {/* COLLABORATING ON - Other teams' projects we're involved in */}
      {(collaborations ?? []).length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-medium text-muted-foreground mb-4 flex items-center gap-2 uppercase tracking-wider">
            <Users className="w-4 h-4" />
            Collaborating On
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(collaborations ?? []).map(
              (project: {
                id: string
                name: string
                updatedAt: string
                space?: { name: string }
                members?: { id: string }[]
              }) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  workspaceSlug={workspaceSlug}
                />
              )
            )}
          </div>
        </section>
      )}

      {/* TEAM DOCS */}
      <section>
        <h2 className="text-xs font-medium text-muted-foreground mb-4 flex items-center gap-2 uppercase tracking-wider">
          <FileText className="w-4 h-4" />
          Team Docs
        </h2>
        <div className="space-y-1">
          {(teamDocs ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No documents yet.</p>
          ) : (
            (teamDocs ?? []).map(
              (page: {
                id: string
                title: string
                slug: string
                updatedAt: string
                createdBy?: { name: string | null }
                _count?: { children: number }
              }) => (
                <Link
                  key={page.id}
                  href={`/wiki/${page.slug}`}
                  className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {(page._count?.children ?? 0) > 0 ? (
                      <Folder className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="truncate">{page.title}</span>
                    {(page._count?.children ?? 0) > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {page._count!.children} pages
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
                    <span>
                      Updated by {page.createdBy?.name ?? "Unknown"}
                    </span>
                    <span>
                      {formatDistanceToNow(new Date(page.updatedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </Link>
              )
            )
          )}
        </div>
      </section>

      {/* Sub-spaces (children) */}
      {space.children && space.children.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-medium text-muted-foreground mb-4 flex items-center gap-2 uppercase tracking-wider">
            <Folder className="w-4 h-4" />
            Folders
          </h2>
          <div className="space-y-1">
            {space.children.map((child) => (
              <Link
                key={child.id}
                href={`${baseHref}/spaces/${child.id}`}
                className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Folder
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: child.color ?? accent }}
                  />
                  <span className="truncate">{child.name}</span>
                  {child._count && (
                    <span className="text-sm text-muted-foreground">
                      {child._count.projects + child._count.wikiPages} items
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground flex-shrink-0">
                  {formatDistanceToNow(new Date(child.updatedAt), {
                    addSuffix: true,
                  })}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Members (only shown for PRIVATE spaces) */}
      {space.visibility === "PRIVATE" && space.members.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider">
            Members
          </h2>
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
                  <span className="text-xs text-muted-foreground capitalize">
                    {m.role.toLowerCase()}
                  </span>
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
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["spaces", spaceId] })
          queryClient.invalidateQueries({ queryKey: ["spaces", spaceId, "projects"] })
          queryClient.invalidateQueries({ queryKey: ["spaces", spaceId, "docs"] })
        }}
      />
    </div>
  )
}
