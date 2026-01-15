import { prisma } from "@/lib/db"

export async function getFreshnessSummary(orgId: string) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000

  let staleAvailability = 0

  try {
    const rows = await prisma.personAvailability.findMany({
      where: { orgId } as any,
      select: { updatedAt: true, createdAt: true } as any,
      take: 50000,
    })

    for (const r of rows) {
      const ts = new Date((r as any).updatedAt ?? (r as any).createdAt).getTime()
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

