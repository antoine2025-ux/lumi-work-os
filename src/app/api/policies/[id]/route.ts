/**
 * Loopbrain Policy — Get / Update / Delete
 *
 * GET    /api/policies/[id] — Get single policy with recent executions
 * PUT    /api/policies/[id] — Update policy
 * DELETE /api/policies/[id] — Delete policy
 */

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { PolicyUpdateSchema } from '@/lib/validations/policies'
import { computeNextRunAt } from '@/lib/loopbrain/policies/scheduler'
import type { ScheduleConfig } from '@/lib/validations/policies'

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
      include: {
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 5,
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
        },
      },
    })

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
    }

    const isOwner = policy.userId === auth.user.userId
    const isAdmin = auth.user.roles.some((r) => ['ADMIN', 'OWNER'].includes(r))
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ policy })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const existing = await prisma.loopbrainPolicy.findUnique({
      where: { id },
      select: { userId: true, content: true, scheduleConfig: true, triggerType: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
    }

    if (existing.userId !== auth.user.userId) {
      return NextResponse.json({ error: 'Only the policy owner can edit' }, { status: 403 })
    }

    const body = await request.json()
    const data = PolicyUpdateSchema.parse(body)

    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.triggerType !== undefined) updateData.triggerType = data.triggerType
    if (data.scheduleType !== undefined) updateData.scheduleType = data.scheduleType
    if (data.scheduleConfig !== undefined) updateData.scheduleConfig = data.scheduleConfig
    if (data.triggerConfig !== undefined) updateData.triggerConfig = data.triggerConfig
    if (data.maxActions !== undefined) updateData.maxActions = data.maxActions
    if (data.tokenBudget !== undefined) updateData.tokenBudget = data.tokenBudget
    if (data.enabled !== undefined) updateData.enabled = data.enabled

    if (data.content !== undefined) {
      updateData.content = data.content
      if (data.content !== existing.content) {
        updateData.compiledPlan = Prisma.JsonNull
        updateData.compiledAt = null
        updateData.compileError = null
      }
    }

    if (data.scheduleConfig) {
      const nextRun = computeNextRunAt(data.scheduleConfig as ScheduleConfig)
      if (nextRun) updateData.nextRunAt = nextRun
    }

    const policy = await prisma.loopbrainPolicy.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ policy })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const existing = await prisma.loopbrainPolicy.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
    }

    const isOwner = existing.userId === auth.user.userId
    const isAdmin = auth.user.roles.some((r) => ['ADMIN', 'OWNER'].includes(r))
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.loopbrainPolicy.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
