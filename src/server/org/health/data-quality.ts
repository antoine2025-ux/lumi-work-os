import { prisma } from "@/lib/db"
import { getPeopleIdentityMap } from "@/server/org/people/identity"

export async function getDataQualityDeepDive(orgId: string) {
  const peopleMap = await getPeopleIdentityMap(orgId)

  // 1) Stale availability: last availability older than N days (if createdAt/updatedAt exists)
  const stale: Array<{ personId: string; label: string; updatedAt: string }> = []
  try {
    const rows = await prisma.personAvailability.findMany({
      where: { workspaceId: orgId } as any,
      select: { personId: true, updatedAt: true, createdAt: true } as any,
      take: 50000,
    })
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000
    for (const r of rows) {
      const ts = new Date((r as any).updatedAt ?? (r as any).createdAt).getTime()
      if (Number.isFinite(ts) && ts < cutoff) {
        const id = String((r as any).personId)
        stale.push({
          personId: id,
          label: peopleMap.get(id)?.label ?? `Person ${id.slice(0, 8)}`,
          updatedAt: new Date(ts).toISOString(),
        })
      }
    }
  } catch {
    // ignore
  }

  // 2) Conflicting manager links: same person with >1 active manager (v0: count duplicates by personId)
  const conflicts: Array<{ personId: string; label: string; managers: number; managerIds: string[] }> = []
  try {
    const links = await prisma.personManagerLink.findMany({
      where: { workspaceId: orgId } as any,
      select: { personId: true, managerId: true } as any,
      take: 200000,
    })

    const mgrSetByPerson = new Map<string, Set<string>>()
    for (const l of links) {
      const pid = String((l as any).personId)
      const mid = String((l as any).managerId)
      const set = mgrSetByPerson.get(pid) ?? new Set<string>()
      set.add(mid)
      mgrSetByPerson.set(pid, set)
    }

    for (const [pid, set] of mgrSetByPerson.entries()) {
      if (set.size > 1) {
        const managersArr = Array.from(set.values())
        conflicts.push({
          personId: pid,
          label: peopleMap.get(pid)?.label ?? `Person ${pid.slice(0, 8)}`,
          managers: managersArr.length,
          managerIds: managersArr,
        })
      }
    }
  } catch {
    // ignore
  }

  // 3) Over-allocated people (based on allocations if the model exists)
  const overAllocated: Array<{ personId: string; label: string; demandPct: number }> = []
  try {
    const allocs = await prisma.capacityAllocation.findMany({
      where: { orgId } as any,
      select: { personId: true, percent: true } as any,
      take: 200000,
    })

    const pctByPerson = new Map<string, number>()
    for (const a of allocs) {
      const pid = String((a as any).personId)
      const pct = Number((a as any).percent ?? 0)
      pctByPerson.set(pid, (pctByPerson.get(pid) ?? 0) + pct)
    }

    for (const [pid, pct] of pctByPerson.entries()) {
      if (pct > 110) {
        overAllocated.push({
          personId: pid,
          label: peopleMap.get(pid)?.label ?? `Person ${pid.slice(0, 8)}`,
          demandPct: Math.round(pct),
        })
      }
    }
  } catch {
    // ignore
  }

  const recommendations: string[] = []
  if (stale.length) recommendations.push("Refresh availability for people with stale updates to keep capacity signals accurate.")
  if (conflicts.length) recommendations.push("Resolve conflicting manager links (one person should have a single active manager in v0).")
  if (overAllocated.length) recommendations.push("Review allocations over 110% to prevent unrealistic demand assumptions.")
  if (!recommendations.length) recommendations.push("Data quality looks healthy. Keep inputs fresh to maintain signal accuracy.")

  return {
    headline: "Data quality",
    summary:
      "Detects stale or conflicting data that can distort Org Health scores. v0 checks availability freshness, manager conflicts, and overallocation.",
    stats: [
      { label: "Stale availability", value: stale.length },
      { label: "Manager conflicts", value: conflicts.length },
      { label: "Over-allocated people", value: overAllocated.length },
    ],
    recommendations,
    sections: [
      {
        title: "Stale availability (14+ days)",
        subtitle: "Refresh availability to reflect current reality.",
        rows: stale.slice(0, 20).map((x) => ({ id: x.personId, name: x.label, note: `Last update ${x.updatedAt}` })),
        empty: "No stale availability detected.",
      },
      {
        title: "Conflicting manager links",
        subtitle: "A person should have a single active manager (v0).",
        rows: conflicts.slice(0, 20).map((x) => ({ id: x.personId, name: x.label, note: `${x.managers} managers`, managerIds: x.managerIds })),
        empty: "No manager conflicts detected.",
      },
      {
        title: "Over-allocated people",
        subtitle: "Demand above 110% suggests unrealistic planning.",
        rows: overAllocated.slice(0, 20).map((x) => ({ id: x.personId, name: x.label, note: `${x.demandPct}% allocated` })),
        empty: "No over-allocation detected.",
      },
    ],
  }
}

