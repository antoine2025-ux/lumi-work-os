import { getDataQualityDeepDive } from "@/server/org/health/data-quality"

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export async function computeDataQualityScore(workspaceId: string): Promise<{
  score: number | null
  stale: number
  conflicts: number
  overallocation: number
}> {
  const dq = await getDataQualityDeepDive(workspaceId)

  const staleSec = dq.sections.find((s) => s.title.startsWith("Stale availability"))
  const confSec = dq.sections.find((s) => s.title.startsWith("Conflicting manager"))
  const overSec = dq.sections.find((s) => s.title.startsWith("Over-allocated"))

  const stale = (staleSec?.rows ?? []).length
  const conflicts = (confSec?.rows ?? []).length
  const overallocation = (overSec?.rows ?? []).length

  // v0 scoring:
  // - stale availability is the biggest distortion → heavier penalty
  // - manager conflicts distort structure/load → medium penalty
  // - overallocation distorts demand → lighter penalty
  const penalty = stale * 5 + conflicts * 3 + overallocation * 2
  const score = clamp(100 - penalty, 0, 100)

  return {
    score,
    stale,
    conflicts,
    overallocation,
  }
}

