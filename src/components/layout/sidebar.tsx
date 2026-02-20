"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useWorkspace } from "@/lib/workspace-context"
import { CreateSpaceDialog } from "@/components/spaces/create-space-dialog"
import { SpaceTreeNav } from "@/components/spaces/space-tree-nav"
import {
  Search,
  CheckSquare,
  Star,
  MessageSquare,
  FolderKanban,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function Sidebar() {
  const pathname = usePathname()
  const { currentWorkspace } = useWorkspace()
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const buildSlugHref = (href: string) => {
    return currentWorkspace?.slug
      ? `/w/${currentWorkspace.slug}${href}`
      : href
  }

  const isActiveRoute = (href: string) => {
    const slugHref = buildSlugHref(href)
    return pathname === slugHref || pathname?.startsWith(slugHref)
  }

  return (
    <>
      <div className="flex h-full w-64 flex-col bg-card border-r">
        {/* Search */}
        <div className="px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-9 h-9 text-sm bg-muted/50"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* SPACES Section */}
          <div className="space-y-1">
            <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Spaces
            </div>

            {/* Contextual tree — expands to show the active space and its contents */}
            {currentWorkspace?.slug && (
              <SpaceTreeNav workspaceSlug={currentWorkspace.slug} />
            )}

            <Link
              href={buildSlugHref("/spaces/home")}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActiveRoute("/spaces/home")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <FolderKanban className="h-5 w-5" />
              <span>All Spaces</span>
            </Link>

            <Button
              variant="ghost"
              onClick={() => setCreateSpaceOpen(true)}
              className="w-full justify-start space-x-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground h-auto"
            >
              <Plus className="h-5 w-5" />
              <span>New Space</span>
            </Button>
          </div>

          {/* MY STUFF Section */}
          <div className="space-y-1">
            <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              My Stuff
            </div>

            <Link
              href={buildSlugHref("/my-tasks")}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActiveRoute("/my-tasks")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <CheckSquare className="h-5 w-5" />
              <span>To-do List</span>
            </Link>

            <Link
              href="#"
              className="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Star className="h-5 w-5" />
              <span>Favorites</span>
            </Link>
          </div>

          {/* TOOLKIT Section */}
          <div className="space-y-1">
            <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Toolkit
            </div>

            <Link
              href={buildSlugHref("/ask")}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActiveRoute("/ask")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <MessageSquare className="h-5 w-5" />
              <span>LoopBrain Chat</span>
            </Link>
          </div>
        </nav>
      </div>

      <CreateSpaceDialog
        open={createSpaceOpen}
        onClose={() => setCreateSpaceOpen(false)}
        onCreated={() => setCreateSpaceOpen(false)}
      />
    </>
  )
}
