import { prisma } from "@/lib/db"

export type ResolvedPerson = {
  personKey: string
  userId: string
  name: string | null
  email: string | null
}

export async function resolvePersonByKey(args: { workspaceId: string; personKey: string }): Promise<ResolvedPerson | null> {
  const { workspaceId, personKey } = args

  // Try Workspace membership first
  // Use try-catch with type assertion to handle cases where model might not exist
  try {
    const membership = await prisma.workspaceMember?.findFirst?.({
      where: { id: personKey, workspaceId },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    if (membership?.user) {
      return {
        personKey: membership.id,
        userId: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
      }
    }
  } catch (error: unknown) {
    // If model doesn't exist or query fails, fall back to user id resolution
    console.warn("[resolvePersonByKey] WorkspaceMember lookup failed, falling back to user:", error instanceof Error ? error.message : error)
  }

  // Fallback: treat personKey as userId
  const user = await prisma.user.findFirst({
    where: { id: personKey },
    select: { id: true, name: true, email: true },
  })

  if (!user) return null

  return {
    personKey: user.id,
    userId: user.id,
    name: user.name,
    email: user.email,
  }
}

