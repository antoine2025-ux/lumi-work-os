import { prisma } from "@/lib/db"
import { getPeopleIdentityMap } from "@/server/org/people/identity"

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export type ManagerLoadMetric = {
  managerId: string
  managerLabel: string
  directReports: number
  risk: "OK" | "WATCH" | "HIGH"
}

export async function computeManagementLoad(orgId: string): Promise<{
  score: number | null
  missingManagerLinks: number
  managerMetrics: ManagerLoadMetric[]
}> {
  const now = Date.now()

  // Pull people count if available
  const peopleCount = await prisma.orgPosition.count({
    where: { workspaceId: orgId, isActive: true, userId: { not: null } },
  }).catch(() => null)
  const p = typeof peopleCount === "number" ? peopleCount : 0

  const links = await prisma.personManagerLink.findMany({
    where: { workspaceId: orgId },
    select: { personId: true, managerId: true, startsAt: true, endsAt: true },
    take: 200000,
  })

  const activeLinks = links.filter((l) => {
    const startsOk = !l.startsAt || new Date(l.startsAt).getTime() <= now
    const endsOk = !l.endsAt || new Date(l.endsAt).getTime() >= now
    return startsOk && endsOk
  })

  // Count direct reports per manager
  const reportsByManager = new Map<string, Set<string>>()
  const hasManagerByPerson = new Set<string>()

  for (const l of activeLinks) {
    const pid = String(l.personId)
    const mid = String(l.managerId)
    hasManagerByPerson.add(pid)

    const set = reportsByManager.get(mid) ?? new Set<string>()
    set.add(pid)
    reportsByManager.set(mid, set)
  }

  // Missing manager links = people without a manager
  // v0: if we can't read people list, estimate 0
  let missingManagerLinks = 0
  try {
    const positions = await prisma.orgPosition.findMany({
      where: { workspaceId: orgId, isActive: true, userId: { not: null } },
      select: { userId: true },
      take: 50000,
    })
    if (Array.isArray(positions)) {
      for (const pos of positions) {
        const id = String(pos.userId)
        if (id && !hasManagerByPerson.has(id)) missingManagerLinks += 1
      }
    }
  } catch {
    missingManagerLinks = 0
  }

  // Get people identity map for real labels
  const peopleMap = await getPeopleIdentityMap(orgId)

  // Build manager metrics
  const managers = Array.from(reportsByManager.entries()).map(([managerId, set]) => {
    const directReports = set.size
    const risk: ManagerLoadMetric["risk"] =
      directReports >= 12 ? "HIGH" : directReports >= 8 ? "WATCH" : "OK"
    const ident = peopleMap.get(managerId)
    const managerLabel = ident?.label ?? `Manager ${managerId.slice(0, 8)}`
    return { managerId, managerLabel, directReports, risk }
  })

  // Score (0..100): penalize missing manager links + high span managers
  // Missing managers ratio penalty up to -50
  const missingRatio = p > 0 ? missingManagerLinks / p : 0
  const missPenalty = clamp(Math.round(missingRatio * 50), 0, 50)

  // High span penalty up to -50 (each HIGH manager reduces score)
  const highCount = managers.filter((m) => m.risk === "HIGH").length
  const watchCount = managers.filter((m) => m.risk === "WATCH").length
  const spanPenalty = clamp(highCount * 10 + watchCount * 4, 0, 50)

  const score = clamp(100 - missPenalty - spanPenalty, 0, 100)

  // Sort most overloaded first
  managers.sort((a, b) => b.directReports - a.directReports)

  return {
    score: p > 0 ? score : null,
    missingManagerLinks,
    managerMetrics: managers.slice(0, 30),
  }
}

