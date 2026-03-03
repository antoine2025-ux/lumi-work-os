"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Folder, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CreateSpaceDialog } from "@/components/spaces/create-space-dialog"
import { SpaceCard } from "@/components/spaces/space-card"
import type { SpaceCardData } from "@/components/spaces/space-card"

export interface TeamSpaceCardData extends SpaceCardData {
  updatedAt: string
  _count: SpaceCardData["_count"] & { members: number }
}

interface TeamSpacesDashboardProps {
  spaces: TeamSpaceCardData[]
}

export function TeamSpacesDashboard({ spaces }: TeamSpacesDashboardProps) {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const workspaceSlug = params?.workspaceSlug as string
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const handleCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["spaces"] })
    router.refresh()
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Folder className="w-5 h-5" />
            <h1 className="text-2xl font-semibold">Team Spaces</h1>
          </div>
          <p className="text-sm text-muted-foreground">Spaces / Team</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Create New Space
        </Button>
      </div>

      <CreateSpaceDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />

      {spaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed rounded-lg bg-muted/30">
          <Folder className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center mb-4">
            No team spaces yet. Create your first space to collaborate with your team.
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Create New Space
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces.map((space) => (
            <SpaceCard key={space.id} space={space} />
          ))}
        </div>
      )}
    </div>
  )
}
