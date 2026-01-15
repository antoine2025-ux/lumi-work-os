"use client"

import { OrgCard } from "@/components/org/ui/OrgCard"
import { AvailabilityStatus, availabilityLabel, availabilityDotClass, isStale } from "./availability"

type Props = {
  availability: {
    status: AvailabilityStatus
    statusSource?: "MANUAL" | "CALENDAR" | "SYSTEM" | "UNKNOWN" | null
    statusNote?: string | null
    nextChangeAt?: string | null
    lastUpdatedAt?: string | null
  }
  location: {
    city?: string | null
    country?: string | null
    timezone?: string | null
  } | null
}

function fmtWhen(iso?: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleString()
}

function fmtLocalTime(timezone?: string | null) {
  if (!timezone) return null
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    }).format(new Date())
  } catch {
    return null
  }
}

export function StatusContextSection(props: Props) {
  const a = props.availability
  const stale = isStale(a.lastUpdatedAt, 72)

  const locLine = props.location
    ? [props.location.city, props.location.country].filter(Boolean).join(", ") || null
    : null

  const localTime = fmtLocalTime(props.location?.timezone ?? null)
  const nextChange = fmtWhen(a.nextChangeAt)

  return (
    <OrgCard title="Status & context" subtitle="Availability and working context.">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4">
          <div className="text-xs text-muted-foreground">Availability</div>
          <div className="mt-2 inline-flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${availabilityDotClass(a.status)}`} />
            <span className="text-sm font-semibold">{availabilityLabel(a.status)}</span>
          </div>
          {a.statusNote ? <div className="mt-2 text-sm text-muted-foreground">{a.statusNote}</div> : null}
          {nextChange ? <div className="mt-2 text-xs text-muted-foreground">Next change: {nextChange}</div> : null}
          {stale ? <div className="mt-2 text-xs text-muted-foreground">Status may be stale</div> : null}
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-xs text-muted-foreground">Location</div>
          <div className="mt-2 text-sm font-semibold">{locLine ?? "—"}</div>
          <div className="mt-2 text-xs text-muted-foreground">
            {props.location?.timezone ? `Timezone: ${props.location.timezone}` : "Timezone not set"}
          </div>
          {localTime ? <div className="mt-2 text-xs text-muted-foreground">Local time: {localTime}</div> : null}
        </div>
      </div>
    </OrgCard>
  )
}

