"use client"

import type { ReactNode } from "react"
import { WikiLayout } from "@/components/wiki/wiki-layout"

export default function WikiPageLayout({
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

