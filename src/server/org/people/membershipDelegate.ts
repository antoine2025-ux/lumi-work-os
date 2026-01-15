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

function getDelegate(name: string) {
  const anyPrisma = prisma as any
  const d = anyPrisma?.[name]
  if (!d) return null
  if (typeof d.findMany !== "function" || typeof d.findFirst !== "function") return null
  return d
}

async function tryListMemberships(delegate: any, workspaceId: string, name: string): Promise<MembershipRow[] | null> {
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
      return rows.map((r: any) => ({ id: String(r.id), userId: String(r.userId) }))
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
        .filter((r: any) => r?.id && r?.user?.id)
        .map((r: any) => ({ id: String(r.id), userId: String(r.user.id) }))
      return mapped
    }
  } catch (err) {
    console.warn(`[membershipDelegate] Delegate ${name} attempt 2 failed:`, err)
  }

  return null
}

async function tryResolveMembership(delegate: any, workspaceId: string, personKey: string, name: string): Promise<MembershipRow | null> {
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
    if (row?.id && row?.user?.id) return { id: String(row.id), userId: String(row.user.id) }
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

