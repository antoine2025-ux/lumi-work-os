/**
 * Loopbrain Policies — List + Create
 *
 * GET  /api/policies — List policies for current user (admins see all)
 * POST /api/policies — Create a new policy
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { PolicyCreateSchema } from '@/lib/validations/policies'
import { computeNextRunAt } from '@/lib/loopbrain/policies/scheduler'
import type { ScheduleConfig } from '@/lib/validations/policies'

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const { searchParams } = new URL(request.url)
    const showAll = searchParams.get('all') === 'true'

    const where = showAll && auth.user.roles.some((r) => ['ADMIN', 'OWNER'].includes(r))
      ? { workspaceId: auth.workspaceId }
      : { workspaceId: auth.workspaceId, userId: auth.user.userId }

    const policies = await prisma.loopbrainPolicy.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            startedAt: true,
            durationMs: true,
            actionsCount: true,
          },
        },
      },
    })

    return NextResponse.json({ policies })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const data = PolicyCreateSchema.parse(body)

    let nextRunAt: Date | null = null
    if (data.triggerType === 'SCHEDULE' && data.scheduleConfig) {
      nextRunAt = computeNextRunAt(data.scheduleConfig as ScheduleConfig)
    }

    const policy = await prisma.loopbrainPolicy.create({
      data: {
        workspaceId: auth.workspaceId,
        userId: auth.user.userId,
        name: data.name,
        description: data.description,
        content: data.content,
        triggerType: data.triggerType,
        scheduleType: data.scheduleType ?? null,
        scheduleConfig: data.scheduleConfig ?? undefined,
        triggerConfig: data.triggerConfig ?? undefined,
        maxActions: data.maxActions,
        tokenBudget: data.tokenBudget,
        nextRunAt,
        enabled: false,
      },
    })

    return NextResponse.json({ policy }, { status: 201 })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
