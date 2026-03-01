import { prisma } from "@/lib/db"

export async function getFreshnessSummary(workspaceId: string) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000

  let staleAvailability = 0

  try {
    const rows = await prisma.personAvailability.findMany({
      where: { workspaceId },
      select: { updatedAt: true, createdAt: true },
      take: 50000,
    })

    for (const r of rows) {
      const ts = new Date(r.updatedAt ?? r.createdAt).getTime()
      if (Number.isFinite(ts) && ts < cutoff) staleAvailability += 1
    }
  } catch {
    // ignore
  }

  return {
    staleAvailability,
    needsAttention: staleAvailability > 0,
  }
}

