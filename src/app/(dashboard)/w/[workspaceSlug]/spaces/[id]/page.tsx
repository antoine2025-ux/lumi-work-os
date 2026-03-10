"use client"

import { use } from "react"
import { TeamSpaceView } from "@/components/spaces/TeamSpaceView"

export default function SpaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <TeamSpaceView spaceId={id} />
}
