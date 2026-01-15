"use client"

import Link from "next/link"

type ContextStripProps = {
  personKey: string
  manager?: { personKey: string; displayName: string; title?: string | null } | null
  directReports: Array<{ personKey: string; displayName: string; title?: string | null }>
  ownerships?: Array<{ entityType: string; entityName: string; role: string }> | null
  capacity?: { loadBand?: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN" } | null
}

export function ContextStrip(props: ContextStripProps) {
  const { manager, directReports, ownerships, capacity } = props
  const hasData = manager || directReports.length > 0 || (ownerships && ownerships.length > 0) || capacity

  // Hide entirely if no data
  if (!hasData) {
    return null
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {manager && (
          <div>
            <span>Reports to: </span>
            <Link
              href={`/org/people/${manager.personKey}`}
              className="font-medium text-foreground hover:underline"
            >
              {manager.displayName}
            </Link>
            {manager.title && <span> ({manager.title})</span>}
          </div>
        )}

        {directReports.length > 0 && (
          <div>
            <span>Manages: </span>
            <span className="font-medium">{directReports.length} people</span>
          </div>
        )}

        {ownerships && ownerships.length > 0 && (
          <div>
            <span>Owns: </span>
            <span className="font-medium">{ownerships.length} {ownerships.length === 1 ? "entity" : "entities"}</span>
          </div>
        )}

        {capacity?.loadBand && capacity.loadBand !== "UNKNOWN" && (
          <div>
            <span>Capacity: </span>
            <span className="font-medium capitalize">{capacity.loadBand.toLowerCase()}</span>
          </div>
        )}

        <div className="ml-auto">
          <Link
            href={`/org/chart?person=${props.personKey}`}
            className="text-primary hover:text-foreground hover:underline"
          >
            View in Org chart →
          </Link>
        </div>
      </div>
    </div>
  )
}

