/**
 * Test-Run Policy
 *
 * POST /api/policies/[id]/test
 *
 * Executes the policy once immediately for testing purposes.
 * Does not require the policy to be enabled.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { executePolicyRun } from '@/lib/loopbrain/policies/executor'

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    })

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
    }

    if (policy.userId !== auth.user.userId) {
      return NextResponse.json({ error: 'Only the policy owner can test' }, { status: 403 })
    }

    if (!policy.compiledPlan) {
      return NextResponse.json(
        { error: 'Policy must be compiled before testing. Click "Compile" first.' },
        { status: 400 },
      )
    }

    const result = await executePolicyRun(policy, 'manual-test')

    return NextResponse.json({
      executionId: result.executionId,
      status: result.status,
      actionsCount: result.actionsCount,
      durationMs: result.durationMs,
      summary: result.result?.summary ?? null,
      error: result.error,
    })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
