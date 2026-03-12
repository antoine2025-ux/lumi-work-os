import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { EscalateGoalSchema } from '@/lib/validations/goals'

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
    const data = EscalateGoalSchema.parse(body)

    // Verify goal exists
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, workspaceId: auth.workspaceId },
      select: { id: true, title: true, workspaceId: true },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Verify escalation target is a workspace member
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: auth.workspaceId,
        userId: data.escalateTo,
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Escalation target is not a workspace member' },
        { status: 400 }
      )
    }

    // Add as REVIEWER stakeholder
    await prisma.goalStakeholder.upsert({
      where: { goalId_userId: { goalId, userId: data.escalateTo } },
      update: { role: 'REVIEWER', canApprove: true },
      create: {
        goalId,
        workspaceId: auth.workspaceId,
        userId: data.escalateTo,
        role: 'REVIEWER',
        canApprove: true,
      },
    })

    // Create an approval request
    await prisma.goalApproval.create({
      data: {
        goalId,
        workspaceId: auth.workspaceId,
        approverId: data.escalateTo,
        status: 'PENDING',
        comment: `Escalation: ${data.reason}`,
      },
    })

    // Log activity
    await prisma.goalUpdate.create({
      data: {
        goalId,
        workspaceId: auth.workspaceId,
        updateType: 'STATUS_CHANGE',
        content: `Goal escalated to ${member.user.name ?? member.user.email}: ${data.reason}`,
        authorId: auth.user.userId,
      },
    })

    await prisma.activity.create({
      data: {
        workspaceId: auth.workspaceId,
        actorId: auth.user.userId,
        entity: 'goal',
        entityId: goalId,
        action: 'GOAL_ESCALATED',
        meta: {
          escalateTo: data.escalateTo,
          escalateToName: member.user.name ?? member.user.email,
          reason: data.reason,
          goalTitle: goal.title,
        },
      },
    })

    // Notify existing stakeholders
    const stakeholders = await prisma.goalStakeholder.findMany({
      where: { goalId },
      select: { userId: true },
    })

    for (const s of stakeholders) {
      if (s.userId !== data.escalateTo) {
        await prisma.activity.create({
          data: {
            workspaceId: auth.workspaceId,
            actorId: s.userId,
            entity: 'goal',
            entityId: goalId,
            action: 'ESCALATION_NOTIFICATION',
            meta: {
              reason: data.reason,
              goalTitle: goal.title,
              escalatedTo: member.user.name ?? member.user.email,
            },
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      action: 'escalate_to_stakeholder',
      impact: {
        escalatedTo: member.user.name ?? member.user.email,
        reason: data.reason,
        stakeholdersNotified: stakeholders.length,
      },
      affectedEntities: [
        { type: 'goal', id: goalId },
        { type: 'user', id: data.escalateTo },
      ],
    })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
