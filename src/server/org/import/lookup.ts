import { prisma } from "@/lib/db"

export async function getPersonIdByEmail(orgId: string, email: string): Promise<string | null> {
  const e = String(email ?? "").trim().toLowerCase()
  if (!e) return null

  // In this codebase, people are represented via OrgPosition with User
  const position = await prisma.orgPosition?.findFirst?.({
    where: {
      workspaceId: orgId,
      isActive: true,
      userId: { not: null },
      user: { email: { equals: e, mode: "insensitive" } } as any,
    } as any,
    select: { userId: true } as any,
  } as any)

  return position?.userId ? String(position.userId) : null
}

export async function getPeopleEmailMap(orgId: string): Promise<Map<string, string>> {
  const positions = await prisma.orgPosition?.findMany?.({
    where: {
      workspaceId: orgId,
      isActive: true,
      userId: { not: null },
    } as any,
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    } as any,
    take: 100000,
  } as any).catch(() => [] as any[])

  const map = new Map<string, string>()
  for (const p of positions || []) {
    if (!p.user) continue
    const id = String(p.user.id)
    const email = p.user.email ? String(p.user.email).trim().toLowerCase() : ""
    if (email) map.set(email, id)
  }
  return map
}

