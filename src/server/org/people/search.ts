import { prisma } from "@/lib/db"

/**
 * Minimal people picker feed for assigning owners.
 * Adjust to your canonical Person model fields once confirmed.
 */
export async function listPeopleForOrg(orgId: string) {
  // In this codebase, people are represented via OrgPosition with User
  const positions = await prisma.orgPosition.findMany({
    where: {
      workspaceId: orgId,
      isActive: true,
      userId: { not: null },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    take: 200,
    orderBy: { createdAt: "desc" },
  })

  return positions
    .filter((p) => p.user)
    .map((p) => ({
      id: String(p.user!.id),
      name: String(p.user!.name ?? p.user!.email ?? `Person ${String(p.user!.id).slice(0, 8)}`),
      email: p.user!.email ? String(p.user!.email) : null,
    }))
}

