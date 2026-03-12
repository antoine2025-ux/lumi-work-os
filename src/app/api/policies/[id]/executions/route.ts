/**
 * Policy Execution History
 *
 * GET /api/policies/[id]/executions — Paginated list of executions
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const policy = await prisma.loopbrainPolicy.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
    }

    const isOwner = policy.userId === auth.user.userId
    const isAdmin = auth.user.roles.some((r) => ['ADMIN', 'OWNER'].includes(r))
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
    const skip = (page - 1) * limit

    const [executions, total] = await Promise.all([
      prisma.policyExecution.findMany({
        where: { policyId: id },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          status: true,
          triggerSource: true,
          startedAt: true,
          completedAt: true,
          durationMs: true,
          actionsCount: true,
          errorMessage: true,
          userFeedback: true,
        },
      }),
      prisma.policyExecution.count({ where: { policyId: id } }),
    ])

    return NextResponse.json({
      executions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
