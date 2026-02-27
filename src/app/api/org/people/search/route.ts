/**
 * GET /api/org/people/search?q={query}
 * Search workspace members by name or email for calendar picker and similar UIs.
 * Returns minimal person shape: { id, name, email }.
 * Only returns people within the authenticated user's workspace.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertWorkspaceAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { listWorkspaceMemberships } from '@/server/org/people/membershipDelegate'

export async function GET(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req)
    await assertWorkspaceAccess(auth.user.userId, auth.workspaceId, ['MEMBER'])
    setWorkspaceContext(auth.workspaceId)

    const url = new URL(req.url)
    const q = (url.searchParams.get('q') || '').trim()

    if (q.length < 2) {
      return NextResponse.json({ people: [] })
    }

    const { rows: memberships } = await listWorkspaceMemberships(auth.workspaceId)

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ people: [] })
    }

    const userIds = memberships.map((m) => m.userId)
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, email: true },
      take: 20,
      orderBy: { name: 'asc' },
    })

    const people = users.map((u) => ({
      id: u.id,
      name: u.name || u.email?.split('@')[0] || 'Unknown',
      email: u.email || '',
    }))

    return NextResponse.json({ people })
  } catch (error) {
    return handleApiError(error)
  }
}
