import { OrgHealthCard } from "@/components/org/health/OrgHealthCard"
import { requireActiveOrgId } from "@/server/org/context"
import { getLatestOrgHealth } from "@/server/org/health/store"
import { refreshOrgHealth } from "@/server/org/health/refresh"

async function getHealth() {
  const orgId = await requireActiveOrgId()
  
  // Try to get latest persisted snapshot
  const latest = await getLatestOrgHealth(orgId)
  if (latest) {
    return {
      snapshot: {
        capacityScore: latest.snapshot.capacityScore ?? undefined,
        ownershipScore: latest.snapshot.ownershipScore ?? undefined,
        balanceScore: latest.snapshot.balanceScore ?? undefined,
        capturedAt: latest.snapshot.capturedAt.toISOString(),
      },
      signals: latest.signals.map((s) => ({
        id: s.id,
        type: s.type,
        severity: s.severity,
        title: s.title,
        description: s.description,
        createdAt: s.createdAt.toISOString(),
        resolvedAt: s.resolvedAt ? s.resolvedAt.toISOString() : null,
      })),
    }
  }

  // No snapshot yet: compute + store first snapshot
  const computed = await refreshOrgHealth(orgId)
  return {
    snapshot: {
      ...computed.snapshot,
      capturedAt: computed.snapshot.capturedAt.toISOString(),
    },
    signals: computed.signals.map((s) => ({
      id: `sig_${s.type}_${s.severity}`,
      ...s,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    })),
  }
}

export async function OrgHealthSection() {
  try {
    const data = await getHealth()
    return <OrgHealthCard snapshot={data.snapshot} signals={data.signals} />
  } catch {
    return (
      <div className="rounded-2xl border bg-background p-5 text-sm text-muted-foreground shadow-sm">
        Org health is temporarily unavailable.
      </div>
    )
  }
}

