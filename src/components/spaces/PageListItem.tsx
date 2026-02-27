"use client"

import Link from "next/link"
import { FileText } from "lucide-react"

interface PageListItemProps {
  title: string
  status?: string
  timestamp: string
  href: string
}

export function PageListItem({
  title,
  status,
  timestamp,
  href,
}: PageListItemProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="truncate">{title}</span>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-shrink-0">
        {status && <span>{status}</span>}
        {status && <span>·</span>}
        <span>{timestamp}</span>
      </div>
    </Link>
  )
}
