import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { RequestApprovalSchema, UpdateApprovalSchema } from '@/lib/validations/goals'

// ============================================================================
// GET /api/goals/[goalId]/approvals - List approvals
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

    // Verify goal exists
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, workspaceId: auth.workspaceId },
      select: { id: true },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const approvals = await prisma.goalApproval.findMany({
      where: { goalId },
      include: {
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(approvals)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// POST /api/goals/[goalId]/approvals - Request approval from users
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
    const data = RequestApprovalSchema.parse(body)

    // Verify goal exists
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, workspaceId: auth.workspaceId },
      select: { id: true, title: true },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Create approval requests for each approver
    const approvals = await Promise.all(
      data.approverIds.map(async (approverId) => {
        // Skip if approval already exists
        const existing = await prisma.goalApproval.findFirst({
          where: { goalId, approverId, status: 'PENDING' },
        })

        if (existing) return existing

        return prisma.goalApproval.create({
          data: {
            goalId,
            workspaceId: auth.workspaceId,
            approverId,
            status: 'PENDING',
            comment: data.comment,
          },
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        })
      })
    )

    // Log activity
    await prisma.goalUpdate.create({
      data: {
        goalId,
        workspaceId: auth.workspaceId,
        updateType: 'STATUS_CHANGE',
        content: `Requested approval from ${data.approverIds.length} reviewer(s)`,
        authorId: auth.user.userId,
      },
    })

    return NextResponse.json(approvals, { status: 201 })
  } catch (error) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// PATCH /api/goals/[goalId]/approvals - Update an approval
// ============================================================================

export async function PATCH(
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
    const approvalId = url.searchParams.get('approvalId')

    if (!approvalId) {
      return NextResponse.json(
        { error: 'approvalId query parameter is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const data = UpdateApprovalSchema.parse(body)

    // Verify goal exists
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, workspaceId: auth.workspaceId },
      select: { id: true, title: true },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Verify approval exists and belongs to this user
    const approval = await prisma.goalApproval.findFirst({
      where: { id: approvalId, goalId, approverId: auth.user.userId },
    })

    if (!approval) {
      return NextResponse.json(
        { error: 'Approval not found or you are not the assigned approver' },
        { status: 404 }
      )
    }

    const updated = await prisma.goalApproval.update({
      where: { id: approvalId },
      data: {
        status: data.status,
        comment: data.comment ?? approval.comment,
      },
      include: {
        approver: {
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
    const statusLabel = data.status.toLowerCase().replace('_', ' ')
    await prisma.goalUpdate.create({
      data: {
        goalId,
        workspaceId: auth.workspaceId,
        updateType: 'STATUS_CHANGE',
        content: `${updated.approver.name ?? updated.approver.email} ${statusLabel} the goal`,
        authorId: auth.user.userId,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error, request)
  }
}
