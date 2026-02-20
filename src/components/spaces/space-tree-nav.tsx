'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  LayoutGrid,
  Loader2,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SpaceNode {
  id: string
  name: string
  color: string | null
  isPersonal: boolean
  parentId: string | null
  _count: { projects: number; wikiPages: number; children: number }
}

interface SpaceDetail extends SpaceNode {
  children: SpaceNode[]
  projects: { id: string; name: string; status: string }[]
  wikiPages: { id: string; title: string; slug: string }[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the current space ID from the pathname.
 * Handles: /w/[slug]/spaces/[spaceId]
 * Returns null for /spaces/home or non-space paths.
 */
function parseCurrentSpaceId(pathname: string | null): string | null {
  if (!pathname) return null
  const m = pathname.match(/\/spaces\/([^/]+)/)
  if (!m || m[1] === 'home') return null
  return m[1]
}

// ---------------------------------------------------------------------------
// SpaceTreeItem — renders one node; lazily fetches contents when expanded
// ---------------------------------------------------------------------------

interface SpaceTreeItemProps {
  space: SpaceNode
  depth: number
  workspaceSlug: string
  currentSpaceId: string | null
}

function SpaceTreeItem({ space, depth, workspaceSlug, currentSpaceId }: SpaceTreeItemProps) {
  const isActive = currentSpaceId === space.id

  // Start expanded if this is the active space on mount
  const [expanded, setExpanded] = useState(isActive)

  // Auto-expand when the user navigates to this space (sidebar persists across SPA nav)
  const prevActiveRef = useRef(isActive)
  useEffect(() => {
    if (isActive && !prevActiveRef.current) {
      setExpanded(true)
    }
    prevActiveRef.current = isActive
  }, [isActive])

  const canExpand =
    space._count.projects > 0 ||
    space._count.wikiPages > 0 ||
    space._count.children > 0

  // Lazy-load space detail (children + projects + pages) only when expanded
  const { data: detail, isLoading } = useQuery<SpaceDetail>({
    queryKey: ['space', space.id],
    queryFn: async () => {
      const r = await fetch(`/api/spaces/${space.id}`)
      if (!r.ok) throw new Error('Failed to fetch space')
      return r.json()
    },
    enabled: expanded && canExpand,
    staleTime: 60_000,
  })

  // Indentation: 8px base + 12px per depth level
  const pl = depth * 12 + 8

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault()
    if (canExpand) setExpanded((p) => !p)
  }

  return (
    <div>
      {/* Row */}
      <div
        className={cn(
          'flex items-center rounded-md text-sm transition-colors',
          isActive
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
        )}
        style={{ paddingLeft: pl }}
      >
        {/* Chevron toggle */}
        <button
          onClick={handleToggle}
          className={cn(
            'h-5 w-5 flex items-center justify-center flex-shrink-0 rounded hover:bg-accent transition-colors mr-1',
            !canExpand && 'invisible pointer-events-none',
          )}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Space link */}
        <Link
          href={`/w/${workspaceSlug}/spaces/${space.id}`}
          className="flex-1 flex items-center gap-2 py-1.5 pr-2 min-w-0"
        >
          {space.isPersonal ? (
            <User
              className="h-4 w-4 flex-shrink-0"
              style={{ color: space.color ?? '#6366f1' }}
            />
          ) : expanded ? (
            <FolderOpen
              className="h-4 w-4 flex-shrink-0"
              style={{ color: space.color ?? '#6366f1' }}
            />
          ) : (
            <Folder
              className="h-4 w-4 flex-shrink-0"
              style={{ color: space.color ?? '#6366f1' }}
            />
          )}
          <span className="truncate">{space.name}</span>
        </Link>
      </div>

      {/* Expanded contents */}
      {expanded && (
        <div>
          {isLoading && (
            <div style={{ paddingLeft: pl + 20 }} className="py-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </div>
          )}

          {detail && (
            <>
              {/* Sub-spaces (folders) — recursive */}
              {detail.children.map((child) => (
                <SpaceTreeItem
                  key={child.id}
                  space={child}
                  depth={depth + 1}
                  workspaceSlug={workspaceSlug}
                  currentSpaceId={currentSpaceId}
                />
              ))}

              {/* Projects */}
              {detail.projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/w/${workspaceSlug}/projects/${project.id}`}
                  className="flex items-center gap-2 py-1.5 pr-2 text-sm rounded-md transition-colors text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  style={{ paddingLeft: pl + 20 }}
                >
                  <LayoutGrid className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                  <span className="truncate">{project.name}</span>
                </Link>
              ))}

              {/* Wiki pages */}
              {detail.wikiPages.map((page) => (
                <Link
                  key={page.id}
                  href={`/wiki/${page.slug}`}
                  className="flex items-center gap-2 py-1.5 pr-2 text-sm rounded-md transition-colors text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  style={{ paddingLeft: pl + 20 }}
                >
                  <FileText className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                  <span className="truncate">{page.title}</span>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SpaceTreeNav — root export; fetches flat space list, renders root nodes
// ---------------------------------------------------------------------------

export function SpaceTreeNav({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname()
  const currentSpaceId = parseCurrentSpaceId(pathname)

  const { data, isLoading } = useQuery<{ spaces: SpaceNode[] }>({
    queryKey: ['spaces'],
    queryFn: async () => {
      const r = await fetch('/api/spaces')
      if (!r.ok) throw new Error('Failed to fetch spaces')
      return r.json()
    },
    staleTime: 30_000,
  })

  // Only render top-level spaces in the tree; sub-spaces load lazily via SpaceTreeItem
  const rootSpaces = (data?.spaces ?? []).filter((s) => !s.parentId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (rootSpaces.length === 0) {
    return (
      <p className="px-3 py-2 text-xs text-muted-foreground">No spaces yet.</p>
    )
  }

  return (
    <div className="space-y-0.5">
      {rootSpaces.map((space) => (
        <SpaceTreeItem
          key={space.id}
          space={space}
          depth={0}
          workspaceSlug={workspaceSlug}
          currentSpaceId={currentSpaceId}
        />
      ))}
    </div>
  )
}
