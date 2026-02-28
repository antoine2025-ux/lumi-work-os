import { prisma } from "@/lib/db"
import { OrgHealthSignalType, OrgHealthSeverity } from "@prisma/client"
import type { ComputedHealth } from "@/server/org/health/compute"

type StoreInput = {
  orgId: string
  computed: ComputedHealth
}

function stableSignalKey(s: { type: string; severity: string; title: string; contextId?: string }) {
  const ctx = s.contextId ? `::${s.contextId}` : ""
  return `${s.type}::${s.severity}::${s.title}${ctx}`.toLowerCase()
}

export async function storeOrgHealthSnapshot({ orgId, computed }: StoreInput) {
  // 1) Write snapshot
  const snapshot = await prisma.orgHealthSnapshot.create({
      data: {
        workspaceId: orgId,
        capturedAt: computed.snapshot.capturedAt,
        capacityScore: computed.snapshot.capacityScore ?? null,
        ownershipScore: computed.snapshot.ownershipScore ?? null,
        balanceScore: computed.snapshot.balanceScore ?? null,
        managementScore: computed.snapshot.managementScore ?? null,
        dataQualityScore: computed.snapshot.dataQualityScore ?? null,
        phaseCVersion: computed.snapshot.phaseCVersion ?? null,
      },
  })

  // 2) Dedupe computed signals in-memory
  const deduped = Array.from(
    new Map(
      computed.signals.map((s) => [stableSignalKey(s), { ...s, signalKey: stableSignalKey(s) }])
    ).values()
  )

  const computedKeys = new Set(deduped.map((s) => s.signalKey))

  // 3) Load currently open signals (not resolved, not dismissed)
  const open = await prisma.orgHealthSignal.findMany({
    where: { workspaceId: orgId, resolvedAt: null, dismissedAt: null },
    select: { id: true, signalKey: true },
  })

  const openKeys = new Set(open.map((s) => s.signalKey))

  // 4) Create only missing open signals (dedupe across refreshes)
  const toCreate = deduped.filter((s) => !openKeys.has(s.signalKey))

  if (toCreate.length) {
    await prisma.orgHealthSignal.createMany({
      data: toCreate.map((s) => ({
        workspaceId: orgId,
        signalKey: s.signalKey,
        type: s.type as OrgHealthSignalType,
        severity: s.severity as OrgHealthSeverity,
        title: s.title,
        description: s.description,
        contextType: s.contextType ?? null,
        contextId: s.contextId ?? null,
        contextLabel: s.contextLabel ?? null,
        href: s.href ?? null,
        resolvedAt: null,
        dismissedAt: null,
      })),
    })
  }

  // 5) Auto-resolve stale signals that are no longer present in computed set
  const stale = open.filter((s) => !computedKeys.has(s.signalKey))
  if (stale.length) {
    await prisma.orgHealthSignal.updateMany({
      where: { workspaceId: orgId, id: { in: stale.map((s) => s.id) } },
      data: { resolvedAt: new Date() },
    })
  }

  return snapshot
}

export async function getLatestOrgHealth(orgId: string) {
  const snapshot = await prisma.orgHealthSnapshot.findFirst({
    where: { workspaceId: orgId },
    orderBy: { capturedAt: "desc" },
  })

  if (!snapshot) return null

  const signals = await prisma.orgHealthSignal.findMany({
    where: { workspaceId: orgId, resolvedAt: null, dismissedAt: null },
    orderBy: { createdAt: "desc" },
    take: 12,
  })

  return { snapshot, signals }
}

export async function getOrgHealthHistory(orgId: string, take: number = 30) {
  const snapshots = await prisma.orgHealthSnapshot.findMany({
    where: { workspaceId: orgId },
    orderBy: { capturedAt: "desc" },
    take,
  })

  return snapshots
}

export async function getOpenOrgHealthSignals(orgId: string, take: number = 50) {
  const signals = await prisma.orgHealthSignal.findMany({
    where: { workspaceId: orgId, resolvedAt: null, dismissedAt: null },
    orderBy: { createdAt: "desc" },
    take,
  })

  return signals
}

export async function getLatestOrgHealthSnapshot(orgId: string) {
  const snapshot = await prisma.orgHealthSnapshot.findFirst({
    where: { workspaceId: orgId },
    orderBy: { capturedAt: "desc" },
  })

  return snapshot
}

export async function getPreviousOrgHealthSnapshot(orgId: string) {
  const snapshots = await prisma.orgHealthSnapshot.findMany({
    where: { workspaceId: orgId },
    orderBy: { capturedAt: "desc" },
    take: 2,
  })

  // Return the second most recent snapshot (previous one)
  return snapshots.length >= 2 ? snapshots[1] : null
}

