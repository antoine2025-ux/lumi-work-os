"use client"

import type { ReactNode } from "react"
import { SpacesLayoutShell } from "@/components/spaces/SpacesLayoutShell"

export default function SpacesPageLayout({
  children,
}: {
  children: ReactNode
}) {
  return <SpacesLayoutShell>{children}</SpacesLayoutShell>
}
