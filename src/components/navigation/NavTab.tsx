"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

interface NavTabProps {
  href: string
  active: boolean
  children: React.ReactNode
}

export function NavTab({ href, active, children }: NavTabProps) {
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "text-sm font-medium transition-colors",
        active
          ? "text-foreground font-semibold"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </Link>
  )
}
