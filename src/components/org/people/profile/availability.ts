export type AvailabilityStatus = "AVAILABLE" | "LIMITED" | "UNAVAILABLE" | "OOO" | "UNKNOWN"

export function availabilityLabel(s: AvailabilityStatus) {
  if (s === "AVAILABLE") return "Available"
  if (s === "LIMITED") return "Limited"
  if (s === "UNAVAILABLE") return "Unavailable"
  if (s === "OOO") return "Out of office"
  return "Unknown"
}

export function availabilityDotClass(s: AvailabilityStatus) {
  // No bright colors; subtle intensity only
  if (s === "AVAILABLE") return "bg-foreground/40"
  if (s === "LIMITED") return "bg-foreground/25"
  if (s === "UNAVAILABLE") return "bg-foreground/15"
  if (s === "OOO") return "bg-foreground/20"
  return "bg-foreground/10"
}

export function isStale(lastUpdatedAt?: string | null, maxHours = 72) {
  if (!lastUpdatedAt) return false
  const t = new Date(lastUpdatedAt).getTime()
  if (!Number.isFinite(t)) return false
  const ageHours = (Date.now() - t) / (1000 * 60 * 60)
  return ageHours > maxHours
}

