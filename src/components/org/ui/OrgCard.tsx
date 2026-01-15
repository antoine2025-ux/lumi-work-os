import React from "react"
import { orgTokens } from "@/components/org/ui/tokens"

export function OrgCard(props: { title?: string; subtitle?: string | React.ReactNode; children: React.ReactNode; right?: React.ReactNode; actions?: React.ReactNode }) {
  // Support both 'right' and 'actions' for backward compatibility
  const rightContent = props.actions || props.right
  return (
    <div className={orgTokens.card}>
      {(props.title || props.subtitle || rightContent) && (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {props.title && <div className={orgTokens.title}>{typeof props.title === "string" ? props.title : String(props.title)}</div>}
            {props.subtitle && <div className={`mt-1 ${orgTokens.subtleText}`}>{typeof props.subtitle === "string" ? props.subtitle : String(props.subtitle)}</div>}
          </div>
          {rightContent ? <div className="shrink-0">{rightContent}</div> : null}
        </div>
      )}
      <div className={props.title || props.subtitle || rightContent ? "mt-4" : ""}>{props.children}</div>
    </div>
  )
}

