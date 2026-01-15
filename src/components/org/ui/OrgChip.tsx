import React from "react"
import { orgTokens } from "@/components/org/ui/tokens"

export function OrgChip(props: { children: React.ReactNode }) {
  return <span className={orgTokens.chip}>{props.children}</span>
}

