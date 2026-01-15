// src/lib/org-health/types.ts

export type OrgHealthSignal = {
  id: string
  severity: "CRITICAL" | "WARNING" | "INFO"
  title: string
  description: string
  type?: string
  resolvedAt?: Date | string | null
  dismissedAt?: Date | string | null
  createdAt?: Date | string
}

export type OrgHealthSnapshot = {
  id?: string
  capacityScore?: number
  ownershipScore?: number
  balanceScore?: number
  managementScore?: number
  dataQualityScore?: number
  capturedAt: Date | string
}

