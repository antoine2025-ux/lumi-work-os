"use client"

import type { ReactNode } from "react"
import { WikiLayout } from "@/components/wiki/wiki-layout"

export default function SpacesPageLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <WikiLayout>
      {children}
    </WikiLayout>
  )
}
