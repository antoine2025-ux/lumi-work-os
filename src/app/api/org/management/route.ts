/**
 * GET /api/org/management
 * Unified hub endpoint returning all 4 org management entity types:
 *   departments, teams, job descriptions, role cards
 *
 * Query params:
 *   type:   'all' | 'departments' | 'teams' | 'job-descriptions' | 'role-cards'  (default: 'all')
 *   search: string — case-insensitive name filter applied across all returned types
 *
 * Auth: getUnifiedAuth → assertAccess(ADMIN) → setWorkspaceContext → handleApiError
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'

type EntityType = 'all' | 'departments' | 'teams' | 'job-descriptions' | 'role-cards'

const VALID_TYPES: EntityType[] = ['all', 'departments', 'teams', 'job-descriptions', 'role-cards']

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    const userId = auth?.user?.userId
    const workspaceId = auth?.workspaceId

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await assertAccess({ userId, workspaceId, scope: 'workspace', requireRole: ['ADMIN'] })
    setWorkspaceContext(workspaceId)

    const { searchParams } = new URL(request.url)
    const rawType = searchParams.get('type') ?? 'all'
    const type: EntityType = VALID_TYPES.includes(rawType as EntityType)
      ? (rawType as EntityType)
      : 'all'
    const search = searchParams.get('search')?.trim() ?? ''

    const fetchAll = type === 'all'
    const fetchDepts = fetchAll || type === 'departments'
    const fetchTeams = fetchAll || type === 'teams'
    const fetchJDs = fetchAll || type === 'job-descriptions'
    const fetchRCs = fetchAll || type === 'role-cards'

    const insensitive = 'insensitive' as const

    // Run only needed queries in parallel
    const [deptRows, teamRows, jdRows, rcRows] = await Promise.all([
      fetchDepts
        ? prisma.orgDepartment.findMany({
            where: {
              workspaceId,
              isActive: true,
              ...(search ? { name: { contains: search, mode: insensitive } } : {}),
            },
            include: {
              _count: { select: { teams: true } },
              teams: {
                where: { isActive: true },
                select: {
                  _count: { select: { positions: { where: { isActive: true } } } },
                },
              },
            },
            orderBy: { name: 'asc' },
          })
        : Promise.resolve([] as never[]),

      fetchTeams
        ? prisma.orgTeam.findMany({
            where: {
              workspaceId,
              isActive: true,
              ...(search ? { name: { contains: search, mode: insensitive } } : {}),
            },
            include: {
              department: { select: { id: true, name: true } },
              leader: { select: { id: true, name: true } },
              _count: { select: { positions: { where: { isActive: true } } } },
            },
            orderBy: { name: 'asc' },
          })
        : Promise.resolve([] as never[]),

      fetchJDs
        ? prisma.jobDescription.findMany({
            where: {
              workspaceId,
              ...(search ? { title: { contains: search, mode: insensitive } } : {}),
            },
            include: {
              _count: { select: { positions: true } },
            },
            orderBy: { title: 'asc' },
          })
        : Promise.resolve([] as never[]),

      fetchRCs
        ? prisma.roleCard.findMany({
            where: {
              workspaceId,
              ...(search ? { roleName: { contains: search, mode: insensitive } } : {}),
            },
            include: {
              position: {
                select: {
                  id: true,
                  userId: true,
                  user: { select: { id: true, name: true } },
                  team: { select: { id: true, name: true } },
                },
              },
            },
            orderBy: { roleName: 'asc' },
          })
        : Promise.resolve([] as never[]),
    ])

    // Batch-resolve ownerPersonId → User name for departments (raw string FK → User.id)
    const ownerIds = deptRows
      .map((d) => d.ownerPersonId)
      .filter((id): id is string => typeof id === 'string')
    const ownerMap = new Map<string, string | null>()
    if (ownerIds.length > 0) {
      const owners = await prisma.user.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, name: true },
      })
      owners.forEach((o) => ownerMap.set(o.id, o.name))
    }

    const departmentItems = deptRows.map((d) => ({
      type: 'department' as const,
      id: d.id,
      name: d.name,
      description: d.description ?? null,
      ownerPersonId: d.ownerPersonId ?? null,
      ownerName: d.ownerPersonId ? (ownerMap.get(d.ownerPersonId) ?? null) : null,
      color: d.color ?? null,
      teamCount: d._count.teams,
      peopleCount: d.teams.reduce((sum, t) => sum + t._count.positions, 0),
      createdAt: d.createdAt.toISOString(),
    }))

    const teamItems = teamRows.map((t) => ({
      type: 'team' as const,
      id: t.id,
      name: t.name,
      description: t.description ?? null,
      departmentId: t.departmentId ?? null,
      departmentName: t.department?.name ?? null,
      leaderId: t.leaderId ?? null,
      leaderName: t.leader?.name ?? null,
      color: t.color ?? null,
      peopleCount: t._count.positions,
      createdAt: t.createdAt.toISOString(),
    }))

    const jdItems = jdRows.map((jd) => ({
      type: 'job-description' as const,
      id: jd.id,
      name: jd.title,
      description: jd.summary ?? null,
      level: jd.level ?? null,
      jobFamily: jd.jobFamily ?? null,
      positionCount: jd._count.positions,
      createdAt: jd.createdAt.toISOString(),
    }))

    const rcItems = rcRows.map((rc) => ({
      type: 'role-card' as const,
      id: rc.id,
      name: rc.roleName,
      description: rc.roleDescription ?? null,
      level: rc.level ?? null,
      jobFamily: rc.jobFamily ?? null,
      positionId: rc.positionId ?? null,
      assignedToName: rc.position?.user?.name ?? null,
      teamName: rc.position?.team?.name ?? null,
      createdAt: rc.createdAt.toISOString(),
    }))

    const items = [...departmentItems, ...teamItems, ...jdItems, ...rcItems]

    return NextResponse.json({
      ok: true,
      items,
      counts: {
        departments: departmentItems.length,
        teams: teamItems.length,
        jobDescriptions: jdItems.length,
        roleCards: rcItems.length,
        total: items.length,
      },
    })
  } catch (error) {
    return handleApiError(error, request)
  }
}
