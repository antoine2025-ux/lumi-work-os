// ORG CONTRACT FROZEN (Phase D)
// Changes require explicit product decision + version bump.
//
// NOTE: v1 extended to expose existing data (capacity, domains, systems, health).
// No new concepts introduced. Any new concepts require v2.
// This contract is intentionally minimal and capped for reasoning, not analytics.
// Anything larger requires batching or v2.

export type OrgSnapshotV1 = {
  version: "v1"
  generatedAt: string

  org: {
    id: string
    name?: string | null
  }

  people: Array<{
    id: string
    name: string
    email?: string | null
    title?: string | null
    availability?: { status: "AVAILABLE" | "LIMITED" | "UNAVAILABLE"; reason?: string | null; updatedAt?: string | null }
    roles?: Array<{ role: string; percent: number }>
    skills?: string[]
    teamIds?: string[]
    managerIds?: string[]
    capacity?: {
      fte?: number
      shrinkagePct?: number
      allocationPct?: number
    }
  }>

  teams: Array<{
    id: string
    name: string
    leadPersonId?: string | null
    memberIds?: string[]
  }>

  domains?: Array<{
    id: string
    name: string
  }>

  systems?: Array<{
    id: string
    name: string
  }>

  ownership: Array<{
    entityType: "TEAM" | "DOMAIN" | "SYSTEM"
    entityId: string
    primaryOwnerPersonId: string
  }>

  taxonomy?: {
    roles?: string[]
    skills?: string[]
  }

  health?: {
    trustScore: number
    signals: Array<{
      key: string
      severity: "INFO" | "WARNING" | "HIGH"
      count?: number
    }>
  }
}

