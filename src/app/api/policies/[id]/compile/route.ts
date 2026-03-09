/**
 * Compile Policy Content
 *
 * POST /api/policies/[id]/compile
 *
 * Compiles the policy's markdown content into a structured AgentPlan
 * using the LLM. Stores the result on the policy record.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { compilePolicy } from '@/lib/loopbrain/policies/compiler'
import { toolRegistry } from '@/lib/loopbrain/agent/tool-registry'

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
      select: { userId: true, content: true },
    })

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
    }

    if (policy.userId !== auth.user.userId) {
      return NextResponse.json({ error: 'Only the policy owner can compile' }, { status: 403 })
    }

    const toolDefs = toolRegistry.toToolDefinitions()

    const result = await compilePolicy(
      policy.content,
      toolDefs,
      { workspaceId: auth.workspaceId, userId: auth.user.userId },
    )

    if (result.success && result.plan) {
      await prisma.loopbrainPolicy.update({
        where: { id },
        data: {
          compiledPlan: result.plan as unknown as Prisma.InputJsonValue,
          compiledAt: new Date(),
          compileError: null,
        },
      })
    } else {
      await prisma.loopbrainPolicy.update({
        where: { id },
        data: {
          compileError: result.error ?? 'Unknown compilation error',
          compiledAt: null,
          compiledPlan: Prisma.JsonNull,
        },
      })
    }

    return NextResponse.json({
      success: result.success,
      plan: result.plan,
      error: result.error,
      warnings: result.warnings,
      suggestions: result.suggestions ?? [],
      estimatedTokens: result.estimatedTokens,
    })
  } catch (error) {
    return handleApiError(error, request)
  }
}
