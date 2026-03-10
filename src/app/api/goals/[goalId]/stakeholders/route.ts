import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { AddStakeholderSchema } from '@/lib/validations/goals'

// ============================================================================
// GET /api/goals/[goalId]/stakeholders - List stakeholders
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const { goalId } = await params
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    // Verify goal exists in workspace
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, workspaceId: auth.workspaceId },
      select: { id: true },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const stakeholders = await prisma.goalStakeholder.findMany({
      where: { goalId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(stakeholders)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// POST /api/goals/[goalId]/stakeholders - Add stakeholder
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const { goalId } = await params
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const data = AddStakeholderSchema.parse(body)

    // Verify goal exists
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, workspaceId: auth.workspaceId },
      select: { id: true, title: true },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Verify user exists and is in workspace
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: auth.workspaceId,
        userId: data.userId,
      },
    })

    if (!member) {
      return NextResponse.json(
        { error: 'User is not a member of this workspace' },
        { status: 400 }
      )
    }

    // Check if stakeholder already exists
    const existing = await prisma.goalStakeholder.findFirst({
      where: { goalId, userId: data.userId },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'User is already a stakeholder on this goal' },
        { status: 409 }
      )
    }

    const stakeholder = await prisma.goalStakeholder.create({
      data: {
        goalId,
        workspaceId: auth.workspaceId,
        userId: data.userId,
        role: data.role,
        canEdit: data.canEdit,
        canApprove: data.canApprove,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    // Log activity
    await prisma.goalUpdate.create({
      data: {
        goalId,
        workspaceId: auth.workspaceId,
        updateType: 'STATUS_CHANGE',
        content: `Added ${stakeholder.user.name ?? stakeholder.user.email} as ${data.role}`,
        authorId: auth.user.userId,
      },
    })

    return NextResponse.json(stakeholder, { status: 201 })
  } catch (error) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// DELETE /api/goals/[goalId]/stakeholders - Remove stakeholder
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const { goalId } = await params
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      )
    }

    // Verify goal exists
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, workspaceId: auth.workspaceId },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const stakeholder = await prisma.goalStakeholder.findFirst({
      where: { goalId, userId },
      include: {
        user: { select: { name: true, email: true } },
      },
    })

    if (!stakeholder) {
      return NextResponse.json(
        { error: 'Stakeholder not found' },
        { status: 404 }
      )
    }

    await prisma.goalStakeholder.delete({
      where: { id: stakeholder.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, request)
  }
}
