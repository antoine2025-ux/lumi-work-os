import { prisma } from "@/lib/db"

type MembershipRow = { id: string; userId: string }

const CANDIDATE_DELEGATES = [
  "workspaceMember",
  "workspaceMembership",
  "workspaceUser",
  "workspaceUsers",
  "userWorkspace",
  "workspaceUserMembership",
] as const

// Dynamic Prisma delegate - we need to access models by name at runtime
type PrismaDelegate = {
  findMany: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>
  findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>
}

function getDelegate(name: string): PrismaDelegate | null {
  const p = prisma as unknown as Record<string, unknown>
  const d = p?.[name]
  if (!d) return null
  const delegate = d as Record<string, unknown>
  if (typeof delegate.findMany !== "function" || typeof delegate.findFirst !== "function") return null
  return delegate as unknown as PrismaDelegate
}

async function tryListMemberships(delegate: PrismaDelegate, workspaceId: string, name: string): Promise<MembershipRow[] | null> {
  // Try common field names and shapes. If include/user relation fails, fall back to select userId.
  // We require: membership.id + membership.userId.
  const where = { workspaceId }

  // Attempt 1: select { id, userId }
  try {
    const rows = await delegate.findMany({
      where,
      select: { id: true, userId: true },
      take: 5000,
    })
    if (Array.isArray(rows) && rows.length && rows[0]?.id && rows[0]?.userId) {
      return rows.map((r) => ({ id: String(r.id), userId: String(r.userId) }))
    }
    if (Array.isArray(rows) && rows.length === 0) return []
  } catch (err) {
    console.warn(`[membershipDelegate] Delegate ${name} attempt 1 failed:`, err)
  }

  // Attempt 2: select { id, user: { select: { id } } } (in case the model uses relation instead of userId)
  try {
    const rows = await delegate.findMany({
      where,
      select: { id: true, user: { select: { id: true } } },
      take: 5000,
    })
    if (Array.isArray(rows)) {
      const mapped = rows
        .filter((r) => r?.id && (r?.user as Record<string, unknown>)?.id)
        .map((r) => ({ id: String(r.id), userId: String((r.user as Record<string, unknown>).id) }))
      return mapped
    }
  } catch (err) {
    console.warn(`[membershipDelegate] Delegate ${name} attempt 2 failed:`, err)
  }

  return null
}

async function tryResolveMembership(delegate: PrismaDelegate, workspaceId: string, personKey: string, name: string): Promise<MembershipRow | null> {
  const where = { workspaceId, id: personKey }

  // Attempt 1: select { id, userId }
  try {
    const row = await delegate.findFirst({ where, select: { id: true, userId: true } })
    if (row?.id && row?.userId) return { id: String(row.id), userId: String(row.userId) }
  } catch (err) {
    console.warn(`[membershipDelegate] Delegate ${name} resolve attempt 1 failed:`, err)
  }

  // Attempt 2: select { id, user: { select: { id } } }
  try {
    const row = await delegate.findFirst({ where, select: { id: true, user: { select: { id: true } } } })
    if (row?.id && (row?.user as Record<string, unknown>)?.id) return { id: String(row.id), userId: String((row.user as Record<string, unknown>).id) }
  } catch (err) {
    console.warn(`[membershipDelegate] Delegate ${name} resolve attempt 2 failed:`, err)
  }

  return null
}

export async function listWorkspaceMemberships(workspaceId: string) {
  for (const name of CANDIDATE_DELEGATES) {
    try {
      const delegate = getDelegate(name)
      if (!delegate) continue
      const rows = await tryListMemberships(delegate, workspaceId, name)
      if (rows !== null) return { delegateName: name, rows }
    } catch (err) {
      console.warn(`[membershipDelegate] Delegate ${name} failed:`, err)
      continue
    }
  }
  return { delegateName: null as string | null, rows: null as MembershipRow[] | null }
}

export async function resolveWorkspaceMembership(workspaceId: string, personKey: string) {
  for (const name of CANDIDATE_DELEGATES) {
    try {
      const delegate = getDelegate(name)
      if (!delegate) continue
      const row = await tryResolveMembership(delegate, workspaceId, personKey, name)
      if (row) return { delegateName: name, row }
    } catch (err) {
      console.warn(`[membershipDelegate] Delegate ${name} resolve failed:`, err)
      continue
    }
  }
  return { delegateName: null as string | null, row: null as MembershipRow | null }
}
