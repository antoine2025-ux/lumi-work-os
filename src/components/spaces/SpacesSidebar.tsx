"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { usePathname, useParams } from "next/navigation"
import {
  User,
  Folder,
  Globe,
  FileText,
  Plus,
  Loader2,
  Search,
  CheckSquare,
  Star,
  MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreateSpaceDialog } from "./create-space-dialog"
import { useState } from "react"
import type { SpaceCardData } from "./space-card"

async function fetchSpaces(): Promise<{ spaces: SpaceCardData[] }> {
  const res = await fetch("/api/spaces")
  if (!res.ok) throw new Error("Failed to load spaces")
  return res.json()
}

function useInvalidateSpaces() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ["spaces"] })
}

export interface SpacesSidebarProps {
  currentSpaceId?: string | null
}

export function SpacesSidebar({ currentSpaceId }: SpacesSidebarProps) {
  const params = useParams()
  const pathname = usePathname()
  const workspaceSlug = params.workspaceSlug as string
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false)
  const invalidateSpaces = useInvalidateSpaces()

  const { data, isLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: fetchSpaces,
    staleTime: 30_000,
  })

  const spaces = data?.spaces ?? []
  const teamSpaces = spaces.filter((s) => !s.isPersonal)

  const isPersonalActive = pathname?.endsWith("/spaces/home") ?? false

  const baseHref = workspaceSlug ? `/w/${workspaceSlug}` : ""

  const isMyTasksActive = pathname?.includes("/my-tasks") ?? false
  const isAskActive = pathname?.includes("/ask") ?? false

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
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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
                  isPersonalActive ? "bg-muted font-medium" : "hover:bg-muted/50"
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
                  return (
                    <Link
                      key={space.id}
                      href={`${baseHref}/spaces/${space.id}`}
                      className={cn(
                        "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm text-left transition-colors",
                        isActive
                          ? "bg-muted border-l-2 border-amber-500 font-medium -ml-0.5 pl-2.5"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <Folder className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{space.name}</span>
                    </Link>
                  )
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCreateSpaceOpen(true)}
                  className="w-full justify-start gap-2 px-2 py-1.5 h-auto text-muted-foreground hover:text-foreground"
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
                <Link
                  href="/wiki/team-workspace"
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-muted/50 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Company Wiki
                </Link>
                <Link
                  href="/wiki"
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-muted/50 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Templates
                </Link>
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
                    isMyTasksActive ? "bg-muted font-medium" : "hover:bg-muted/50"
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

            {/* TOOLKIT */}
            <div>
              <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                TOOLKIT
              </h3>
              <div className="space-y-1">
                <Link
                  href={`${baseHref}/ask`}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors",
                    isAskActive ? "bg-muted font-medium" : "hover:bg-muted/50"
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  LoopBrain Chat
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
