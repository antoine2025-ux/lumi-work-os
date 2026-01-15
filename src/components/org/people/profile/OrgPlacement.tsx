"use client"

import Link from "next/link"

type OrgPlacementProps = {
  personKey: string
  manager?: { personKey: string; displayName: string; title?: string | null } | null
  directReports: Array<{ personKey: string; displayName: string; title?: string | null }>
}

export function OrgPlacement(props: OrgPlacementProps) {
  const { manager, directReports } = props

  // Hide entirely if no data
  if (!manager && directReports.length === 0) {
    return null
  }

  return (
    <div className="py-4 border-b space-y-3">
      {manager && (
        <div className="text-sm">
          <span className="text-muted-foreground">Reports to: </span>
          <Link
            href={`/org/people/${manager.personKey}`}
            className="font-medium text-foreground hover:underline"
          >
            {manager.displayName}
          </Link>
          {manager.title && <span className="text-muted-foreground"> ({manager.title})</span>}
        </div>
      )}

      {directReports.length > 0 && (
        <div className="text-sm">
          <span className="text-muted-foreground">Manages: </span>
          <span className="font-medium">{directReports.length} people</span>
        </div>
      )}

      <div>
        <Link
          href={`/org/chart?person=${props.personKey}`}
          className="text-sm text-primary hover:text-foreground hover:underline"
        >
          View in Org chart →
        </Link>
      </div>
    </div>
  )
}

