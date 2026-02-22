import { prisma } from "@/lib/db"


type Edge = { personId: string; managerId: string }

export type LayerMetrics = {
  peopleCount: number
  linkedPeopleCount: number
  missingManagerLinks: number

  maxDepth: number
  avgDepth: number
  depthHistogram: Array<{ depth: number; count: number }>

  managerlessClusters: number
  notes: string[]
}

/**
 * v0 layer computation:
 * - Builds a manager graph from PersonManagerLink.
 * - Depth is computed as distance to a root (a person with no manager).
 * - Handles cycles defensively (treat as depth=unknown and add a note).
 */
export async function computeLayerMetrics(orgId: string): Promise<LayerMetrics> {
  const now = Date.now()

  // In this codebase, people are represented via OrgPosition with User
  const [positions, links] = await Promise.all([
    prisma.orgPosition.findMany({
      where: { workspaceId: orgId, isActive: true, userId: { not: null } },
      select: { userId: true },
      take: 100000,
    }).catch(() => []),

    prisma.personManagerLink.findMany({
      where: { workspaceId: orgId },
      select: { personId: true, managerId: true, startsAt: true, endsAt: true },
      take: 200000,
    }).catch(() => []),
  ])

  const peopleIds = (positions || [])
    .map((p) => String(p.userId))
    .filter((id) => id && id !== "null")
  const peopleSet = new Set(peopleIds)

  const activeEdges: Edge[] = []
  for (const l of links || []) {
    const startsOk = !l.startsAt || new Date(l.startsAt).getTime() <= now
    const endsOk = !l.endsAt || new Date(l.endsAt).getTime() >= now
    if (!startsOk || !endsOk) continue
    const personId = String(l.personId)
    const managerId = String(l.managerId)
    if (!peopleSet.has(personId)) continue
    // manager might not be in the same people list yet; keep edge anyway
    activeEdges.push({ personId, managerId })
  }

  const managerByPerson = new Map<string, string>()
  for (const e of activeEdges) managerByPerson.set(e.personId, e.managerId)

  const linkedPeopleCount = managerByPerson.size
  const missingManagerLinks = Math.max(0, peopleIds.length - linkedPeopleCount)

  // Roots: people with no manager link (or whose manager is missing and thus treated as root-ish)
  const hasManager = new Set(Array.from(managerByPerson.keys()))
  const roots = peopleIds.filter((id) => !hasManager.has(id))

  // Depth memoization with cycle detection
  const depthMemo = new Map<string, number>()
  const visiting = new Set<string>()
  let cycleCount = 0

  function depthOf(id: string): number {
    if (depthMemo.has(id)) return depthMemo.get(id) as number
    if (visiting.has(id)) {
      cycleCount += 1
      return -1 // indicates cycle
    }
    visiting.add(id)

    const mgr = managerByPerson.get(id)
    let d: number
    if (!mgr) {
      d = 0
    } else if (!peopleSet.has(mgr)) {
      // manager not present in people list → treat as root boundary
      d = 1
    } else {
      const parentDepth = depthOf(mgr)
      d = parentDepth < 0 ? -1 : parentDepth + 1
    }

    visiting.delete(id)
    depthMemo.set(id, d)
    return d
  }

  const depths: number[] = []
  for (const id of peopleIds) {
    const d = depthOf(id)
    if (d >= 0) depths.push(d)
  }

  const maxDepth = depths.length ? Math.max(...depths) : 0
  const avgDepth = depths.length ? Number((depths.reduce((a, b) => a + b, 0) / depths.length).toFixed(2)) : 0

  const hist = new Map<number, number>()
  for (const d of depths) hist.set(d, (hist.get(d) ?? 0) + 1)
  const depthHistogram = Array.from(hist.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([depth, count]) => ({ depth, count }))

  // Managerless clusters (islands) proxy:
  // Count roots; too many roots suggests the graph is fragmented or manager links missing.
  const managerlessClusters = roots.length

  const notes: string[] = []
  if (cycleCount > 0) notes.push("Cycle(s) detected in manager links. Fix cycles to enable accurate layer analysis.")
  if (missingManagerLinks > 0) notes.push(`${missingManagerLinks} people have no manager link.`)
  if (managerlessClusters > Math.max(5, Math.round(peopleIds.length * 0.08))) {
    notes.push("Many roots detected. This may indicate manager links are missing or org is highly fragmented.")
  }

  return {
    peopleCount: peopleIds.length,
    linkedPeopleCount,
    missingManagerLinks,
    maxDepth,
    avgDepth,
    depthHistogram,
    managerlessClusters,
    notes,
  }
}

