/**
 * Service: processLeaveRequest
 *
 * Approves or denies a pending leave request.
 * Extracted from POST /api/org/leave-requests/[id]/approve so both the
 * API route and the Loopbrain executor can call identical logic without
 * duplication.
 */

import { prisma } from '@/lib/db'
import { getProfilePermissions } from '@/lib/org/permissions/profile-permissions'

const LEAVE_TYPE_TO_REASON: Record<string, string> = {
  VACATION: 'VACATION',
  SICK: 'SICK_LEAVE',
  PERSONAL: 'OTHER',
  PARENTAL: 'PARENTAL_LEAVE',
  UNPAID: 'OTHER',
}

export class LeaveRequestError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'NOT_PENDING' | 'ACCESS_DENIED' | 'VALIDATION_ERROR',
    message: string
  ) {
    super(message)
    this.name = 'LeaveRequestError'
  }
}

export interface ProcessLeaveRequestResult {
  status: 'APPROVED' | 'REJECTED'
  personId: string
  startDate: Date
  endDate: Date
}

/**
 * Approve or deny a pending leave request.
 *
 * Validates that the actor has permission (is the person's manager,
 * an admin/owner, or a team lead for the person).
 * On approval, creates a PersonAvailability record.
 *
 * @throws {LeaveRequestError} if validation or permission checks fail
 */
export async function processLeaveRequest(input: {
  leaveRequestId: string
  workspaceId: string
  actorUserId: string
  action: 'approve' | 'deny'
  denialReason?: string
}): Promise<ProcessLeaveRequestResult> {
  const { leaveRequestId, workspaceId, actorUserId, action, denialReason } = input

  const leaveRequest = await prisma.leaveRequest.findFirst({
    where: { id: leaveRequestId, workspaceId },
  })

  if (!leaveRequest) {
    throw new LeaveRequestError('NOT_FOUND', 'Leave request not found')
  }

  if (leaveRequest.status !== 'PENDING') {
    throw new LeaveRequestError('NOT_PENDING', 'Leave request is no longer pending')
  }

  const [permissions, isTeamLeadOfPerson] = await Promise.all([
    getProfilePermissions(actorUserId, leaveRequest.personId, workspaceId),
    prisma.orgTeam.findFirst({
      where: {
        workspaceId,
        leaderId: actorUserId,
        positions: {
          some: {
            userId: leaveRequest.personId,
            isActive: true,
            archivedAt: null,
          },
        },
      },
    }),
  ])

  if (!permissions.canApproveTimeOff && !isTeamLeadOfPerson) {
    throw new LeaveRequestError(
      'ACCESS_DENIED',
      'You do not have permission to approve this leave request'
    )
  }

  if (action === 'deny') {
    if (!denialReason?.trim()) {
      throw new LeaveRequestError(
        'VALIDATION_ERROR',
        'Denial reason is required when denying a request'
      )
    }

    await prisma.leaveRequest.update({
      where: { id: leaveRequestId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: denialReason,
        updatedAt: new Date(),
      },
    })

    return {
      status: 'REJECTED',
      personId: leaveRequest.personId,
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
    }
  }

  // approve
  await prisma.leaveRequest.update({
    where: { id: leaveRequestId },
    data: {
      status: 'APPROVED',
      approvedById: actorUserId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    },
  })

  const reason = LEAVE_TYPE_TO_REASON[leaveRequest.leaveType] ?? 'OTHER'

  await prisma.personAvailability.create({
    data: {
      workspaceId,
      personId: leaveRequest.personId,
      type: 'UNAVAILABLE',
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
      reason: reason as 'VACATION' | 'SICK_LEAVE' | 'PARENTAL_LEAVE' | 'OTHER',
      note: leaveRequest.notes ?? null,
      createdById: actorUserId,
    },
  })

  return {
    status: 'APPROVED',
    personId: leaveRequest.personId,
    startDate: leaveRequest.startDate,
    endDate: leaveRequest.endDate,
  }
}
