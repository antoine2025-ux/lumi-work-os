"use client"

import Link from "next/link"

interface WorkingOnCardProps {
  title: string
  subtitle?: string | null
  meta?: string | null
  timestamp: string
  href: string
}

export function WorkingOnCard({
  title,
  subtitle,
  meta,
  timestamp,
  href,
}: WorkingOnCardProps) {
  return (
    <Link
      href={href}
      className="block p-4 bg-card rounded-lg border hover:border-primary/50 transition-colors"
    >
      <h3 className="font-medium mb-1">{title}</h3>
      {subtitle && (
        <p className="text-sm text-amber-500 mb-2">{subtitle}</p>
      )}
      {meta && (
        <p className="text-sm text-muted-foreground">{meta}</p>
      )}
      <p className="text-xs text-muted-foreground mt-2">{timestamp}</p>
    </Link>
  )
}
