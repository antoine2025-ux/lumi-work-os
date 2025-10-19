"use client"

import { WikiLayout } from "@/components/wiki/wiki-layout"

export default function WikiPageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WikiLayout>
      {children}
    </WikiLayout>
  )
}

