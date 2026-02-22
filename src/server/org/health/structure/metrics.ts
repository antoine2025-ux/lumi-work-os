import { prisma } from "@/lib/db"

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export type StructureMetric = {
  orphanTeams: number
  teamCount: number
  peopleCount: number
  fragmentationRatio: number // teams / people (higher = more fragmented)
  score: number | null
  notes: string[]
}

export async function computeStructureMetrics(orgId: string): Promise<StructureMetric> {
  const [peopleCount, teamCount] = await Promise.all([
    prisma.orgPosition.count({
      where: { workspaceId: orgId, isActive: true, userId: { not: null } },
    }).catch(() => null),
    prisma.orgTeam.count({
      where: { workspaceId: orgId, isActive: true },
    }).catch(() => null),
  ])

  const p = typeof peopleCount === "number" ? peopleCount : 0
  const t = typeof teamCount === "number" ? teamCount : 0

  // Orphan teams: teams with zero members if membership table exists; otherwise 0.
  let orphanTeams = 0
  try {
    // Try common membership models defensively.
    const memberCountByTeam = new Map<string, number>()
    type TeamIdRow = { teamId: string | null }
    const candidates: Array<() => Promise<TeamIdRow[]>> = [
      // Try OrgPosition with teamId (primary source)
      async () => {
        const positions = await prisma.orgPosition.findMany({
          where: { workspaceId: orgId, isActive: true, teamId: { not: null } },
          select: { teamId: true },
          take: 200000,
        }).catch(() => [])
        return positions || []
      },
    ]

    let rows: TeamIdRow[] = []
    for (const fn of candidates) {
      try {
        rows = await fn()
        if (Array.isArray(rows) && rows.length > 0) break
      } catch {
        // next
      }
    }

    if (Array.isArray(rows) && rows.length > 0) {
      for (const r of rows) {
        const id = String(r.teamId)
        memberCountByTeam.set(id, (memberCountByTeam.get(id) ?? 0) + 1)
      }

      const teams = await prisma.orgTeam.findMany({
        where: { workspaceId: orgId, isActive: true },
        select: { id: true },
        take: 50000,
      }).catch(() => [])

      orphanTeams = (teams || []).filter((tt) => (memberCountByTeam.get(String(tt.id)) ?? 0) === 0).length
    }
  } catch {
    orphanTeams = 0
  }

  const fragmentationRatio = p > 0 ? t / p : 0

  const notes: string[] = []
  if (t === 0) notes.push("No teams detected. Create teams to establish structure and ownership.")
  if (orphanTeams > 0) notes.push(`${orphanTeams} teams have no members (orphan teams).`)
  if (p > 0 && fragmentationRatio > 0.45) notes.push("Org appears highly fragmented (many teams relative to people).")

  // Score: start at 100 and apply penalties
  const orphanPenalty = clamp(orphanTeams * 6, 0, 35)
  const fragPenalty = clamp(Math.round(fragmentationRatio * 120), 0, 45)
  const missingTeamPenalty = t === 0 && p > 0 ? 30 : 0

  const score = p > 0 ? clamp(100 - orphanPenalty - fragPenalty - missingTeamPenalty, 0, 100) : null

  return {
    orphanTeams,
    teamCount: t,
    peopleCount: p,
    fragmentationRatio: Number(fragmentationRatio.toFixed(2)),
    score,
    notes,
  }
}

