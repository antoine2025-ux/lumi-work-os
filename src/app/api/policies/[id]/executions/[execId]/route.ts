/**
 * Single Policy Execution Detail
 *
 * GET /api/policies/[id]/executions/[execId] — Full execution with action logs
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'

type RouteParams = { params: Promise<{ id: string; execId: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, execId } = await params
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

    const execution = await prisma.policyExecution.findUnique({
      where: { id: execId },
      include: {
        actionLogs: {
          orderBy: { stepNumber: 'asc' },
        },
      },
    })

    if (!execution || execution.policyId !== id) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 })
    }

    return NextResponse.json({ execution })
  } catch (error) {
    return handleApiError(error, request)
  }
}
