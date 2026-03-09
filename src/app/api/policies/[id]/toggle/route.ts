/**
 * Toggle Policy Enabled/Disabled
 *
 * POST /api/policies/[id]/toggle
 *
 * Enables or disables a policy. On enable, validates the compiled plan
 * and computes the next run time.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { validatePolicy } from '@/lib/loopbrain/policies/validator'
import { computeNextRunAt } from '@/lib/loopbrain/policies/scheduler'
import type { AgentPlan } from '@/lib/loopbrain/agent/types'
import type { AgentRole } from '@/lib/loopbrain/agent/types'
import type { ScheduleConfig } from '@/lib/validations/policies'

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

    const isOwner = policy.userId === auth.user.userId
    const isAdmin = auth.user.roles.some((r) => ['ADMIN', 'OWNER'].includes(r))
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const targetEnabled = typeof body?.enabled === 'boolean' ? body.enabled : !policy.enabled

    if (targetEnabled) {
      const userRole = (auth.user.roles[0] ?? 'MEMBER') as AgentRole
      const validation = validatePolicy({
        content: policy.content,
        compiledPlan: policy.compiledPlan as AgentPlan | null,
        userRole,
        maxActions: policy.maxActions,
      })

      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Policy validation failed', details: validation.errors },
          { status: 400 },
        )
      }

      let nextRunAt: Date | null = null
      if (policy.triggerType === 'SCHEDULE' && policy.scheduleConfig) {
        nextRunAt = computeNextRunAt(policy.scheduleConfig as ScheduleConfig)
      }

      const updated = await prisma.loopbrainPolicy.update({
        where: { id },
        data: {
          enabled: true,
          nextRunAt,
          consecutiveFailures: 0,
          disabledReason: null,
        },
      })

      return NextResponse.json({
        policy: updated,
        warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
      })
    } else {
      const updated = await prisma.loopbrainPolicy.update({
        where: { id },
        data: {
          enabled: false,
          nextRunAt: null,
        },
      })

      return NextResponse.json({ policy: updated })
    }
  } catch (error) {
    return handleApiError(error, request)
  }
}
