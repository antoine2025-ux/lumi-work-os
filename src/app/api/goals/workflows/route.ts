import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { CreateWorkflowSchema } from '@/lib/validations/goals'

// ============================================================================
// GET /api/goals/workflows - List workflow rules
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const rules = await prisma.goalWorkflowRule.findMany({
      where: { workspaceId: auth.workspaceId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(rules)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// POST /api/goals/workflows - Create workflow rule
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const data = CreateWorkflowSchema.parse(body)

    const rule = await prisma.goalWorkflowRule.create({
      data: {
        workspaceId: auth.workspaceId,
        name: data.name,
        trigger: data.trigger,
        conditions: JSON.parse(JSON.stringify(data.conditions)),
        actions: JSON.parse(JSON.stringify(data.actions)),
        isActive: true,
      },
    })

    return NextResponse.json(rule, { status: 201 })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
