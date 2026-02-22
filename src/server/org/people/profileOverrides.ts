import { prisma } from "@/lib/db"

type PrismaDelegate = {
  findUnique: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>
  upsert: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
}

function getProfileOverrideModel(): PrismaDelegate | null {
  const p = prisma as unknown as Record<string, unknown>
  const model = p.orgPersonProfileOverride as PrismaDelegate | undefined
  if (model && typeof model.findUnique === 'function') {
    return model
  }
  return null
}

export async function getProfileOverride(args: { workspaceId: string; userId: string }) {
  const { workspaceId, userId } = args
  const model = getProfileOverrideModel()
  if (!model) {
    console.warn("[profileOverrides] orgPersonProfileOverride model not available (restart dev server after prisma generate)")
    return null
  }
  try {
    return await model.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    })
  } catch (err) {
    console.warn("[profileOverrides] getProfileOverride failed:", err)
    return null
  }
}

export async function upsertProfileOverride(args: {
  workspaceId: string
  userId: string
  data: {
    title?: string | null
    availability?: string | null
    departmentId?: string | null
    teamIds?: string[] | null
    skills?: string[] | null
    notes?: string | null
  }
}) {
  const { workspaceId, userId, data } = args
  const model = getProfileOverrideModel()
  if (!model) {
    console.warn("[profileOverrides] orgPersonProfileOverride model not available. Run: npx prisma generate && restart dev server")
    throw new Error("Profile override model not available. Please run 'npx prisma generate' and restart the dev server.")
  }
  try {
    return await model.upsert({
      where: { workspaceId_userId: { workspaceId, userId } },
      create: {
        workspaceId,
        userId,
        title: data.title ?? null,
        availability: data.availability ?? null,
        departmentId: data.departmentId ?? null,
        teamIds: data.teamIds ?? [],
        skills: data.skills ?? [],
        notes: data.notes ?? null,
      },
      update: {
        title: data.title ?? null,
        availability: data.availability ?? null,
        departmentId: data.departmentId ?? null,
        teamIds: data.teamIds ?? [],
        skills: data.skills ?? [],
        notes: data.notes ?? null,
      },
    })
  } catch (err) {
    console.error("[profileOverrides] upsertProfileOverride failed:", err)
    throw err
  }
}

