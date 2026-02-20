"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Layers } from "lucide-react"
import { Card } from "@/components/ui/card"
import { SpaceCard, type SpaceCardData } from "./space-card"


async function fetchSpaces(): Promise<{ spaces: SpaceCardData[] }> {
  const res = await fetch("/api/spaces")
  if (!res.ok) throw new Error("Failed to load spaces")
  return res.json()
}

export function SpaceList() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["spaces"],
    queryFn: fetchSpaces,
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-destructive">Failed to load spaces. Please refresh.</p>
      </Card>
    )
  }

  const spaces = data?.spaces ?? []
  const personalSpace = spaces.find((s) => s.isPersonal)
  const otherSpaces = spaces.filter((s) => !s.isPersonal)

  if (spaces.length === 0) {
    return (
      <Card className="p-10 text-center">
        <Layers className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No spaces yet. Create one to get started.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Personal space pinned at top */}
      {personalSpace && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            My Space
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <SpaceCard space={personalSpace} />
          </div>
        </div>
      )}

      {/* All other spaces */}
      {otherSpaces.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {personalSpace ? "Shared Spaces" : "Spaces"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {otherSpaces.map((space) => (
              <SpaceCard key={space.id} space={space} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Convenience hook to invalidate the spaces list cache */
export function useInvalidateSpaces() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ["spaces"] })
}
