export type HealthSignalKey =
  | "OWNERSHIP_GAPS"
  | "STALE_AVAILABILITY"
  | "MANAGER_CONFLICTS"
  | "OVERALLOCATION"
  | "UNOWNED_SYSTEMS"

export type HealthSignal = {
  key: HealthSignalKey
  severity: "INFO" | "WARNING" | "HIGH"
  title: string
  description: string
  count?: number
  href: string
}

export function severityFromCount(count: number, bands: { high: number; warn: number }) {
  if (count >= bands.high) return "HIGH"
  if (count >= bands.warn) return "WARNING"
  return "INFO"
}

