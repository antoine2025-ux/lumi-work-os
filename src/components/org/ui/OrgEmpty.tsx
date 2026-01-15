import React from "react"
import { orgTokens } from "@/components/org/ui/tokens"

export function OrgEmpty(props: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className={`${orgTokens.card} text-center`}>
      <div className={orgTokens.title}>{props.title}</div>
      <div className={`mt-2 ${orgTokens.subtleText}`}>{props.description}</div>
      {props.action ? <div className="mt-4 flex justify-center">{props.action}</div> : null}
    </div>
  )
}

