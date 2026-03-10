/**
 * Execution Feedback
 *
 * POST /api/policies/[id]/executions/[execId]/feedback — Submit thumbs up/down
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { PolicyFeedbackSchema } from '@/lib/validations/policies'

type RouteParams = { params: Promise<{ id: string; execId: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    if (policy.userId !== auth.user.userId) {
      return NextResponse.json({ error: 'Only the policy owner can submit feedback' }, { status: 403 })
    }

    const body = await request.json()
    const { feedback } = PolicyFeedbackSchema.parse(body)

    const execution = await prisma.policyExecution.findUnique({
      where: { id: execId },
      select: { policyId: true },
    })

    if (!execution || execution.policyId !== id) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 })
    }

    await prisma.policyExecution.update({
      where: { id: execId },
      data: { userFeedback: feedback },
    })

    return NextResponse.json({ ok: true, feedback })
  } catch (error) {
    return handleApiError(error, request)
  }
}
