/**
 * Unit tests for src/server/org/leave/process-leave-request.ts
 *
 * All Prisma interactions and permission helpers are mocked.
 * Tests verify state transitions, side effects, and error paths.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

// vi.hoisted ensures mock functions exist when vi.mock factories run
const {
  mockLeaveRequestFindFirst,
  mockLeaveRequestUpdate,
  mockPersonAvailabilityCreate,
  mockOrgTeamFindFirst,
  mockGetProfilePermissions,
} = vi.hoisted(() => ({
  mockLeaveRequestFindFirst: vi.fn(),
  mockLeaveRequestUpdate: vi.fn(),
  mockPersonAvailabilityCreate: vi.fn(),
  mockOrgTeamFindFirst: vi.fn(),
  mockGetProfilePermissions: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    leaveRequest: {
      findFirst: mockLeaveRequestFindFirst,
      update: mockLeaveRequestUpdate,
    },
    personAvailability: {
      create: mockPersonAvailabilityCreate,
    },
    orgTeam: {
      findFirst: mockOrgTeamFindFirst,
    },
  },
}))

vi.mock('@/lib/org/permissions/profile-permissions', () => ({
  getProfilePermissions: mockGetProfilePermissions,
}))

import {
  processLeaveRequest,
  LeaveRequestError,
} from '../process-leave-request'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const WORKSPACE_ID = 'ws-1'
const ACTOR_USER_ID = 'actor-1'
const PERSON_ID = 'person-1'
const LEAVE_REQUEST_ID = 'lr-1'

const START_DATE = new Date('2026-03-01')
const END_DATE = new Date('2026-03-07')

function makePendingLeaveRequest(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: LEAVE_REQUEST_ID,
    workspaceId: WORKSPACE_ID,
    personId: PERSON_ID,
    status: 'PENDING',
    leaveType: 'VACATION',
    startDate: START_DATE,
    endDate: END_DATE,
    notes: null,
    ...overrides,
  }
}

function makePermissions(canApprove: boolean) {
  return {
    canApproveTimeOff: canApprove,
    canRequestTimeOff: false,
    canEditCapacity: canApprove,
    permissionLevel: canApprove ? ('admin' as const) : ('none' as const),
    canEditField: () => canApprove,
  }
}

// ---------------------------------------------------------------------------
// Approve path
// ---------------------------------------------------------------------------

describe('processLeaveRequest — approve', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLeaveRequestFindFirst.mockResolvedValue(makePendingLeaveRequest())
    mockGetProfilePermissions.mockResolvedValue(makePermissions(true))
    mockOrgTeamFindFirst.mockResolvedValue(null)
    mockLeaveRequestUpdate.mockResolvedValue({})
    mockPersonAvailabilityCreate.mockResolvedValue({ id: 'avail-1' })
  })

  it('updates leaveRequest to APPROVED with approvedById and approvedAt', async () => {
    const before = new Date()
    await processLeaveRequest({
      leaveRequestId: LEAVE_REQUEST_ID,
      workspaceId: WORKSPACE_ID,
      actorUserId: ACTOR_USER_ID,
      action: 'approve',
    })
    const after = new Date()

    expect(mockLeaveRequestUpdate).toHaveBeenCalledOnce()
    const updateCall = mockLeaveRequestUpdate.mock.calls[0][0]
    expect(updateCall.where).toEqual({ id: LEAVE_REQUEST_ID })
    expect(updateCall.data.status).toBe('APPROVED')
    expect(updateCall.data.approvedById).toBe(ACTOR_USER_ID)
    expect(updateCall.data.approvedAt).toBeInstanceOf(Date)
    expect(updateCall.data.approvedAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 100)
    expect(updateCall.data.approvedAt.getTime()).toBeLessThanOrEqual(after.getTime() + 100)
  })

  it('creates a PersonAvailability record with type UNAVAILABLE', async () => {
    await processLeaveRequest({
      leaveRequestId: LEAVE_REQUEST_ID,
      workspaceId: WORKSPACE_ID,
      actorUserId: ACTOR_USER_ID,
      action: 'approve',
    })

    expect(mockPersonAvailabilityCreate).toHaveBeenCalledOnce()
    const createCall = mockPersonAvailabilityCreate.mock.calls[0][0]
    expect(createCall.data).toMatchObject({
      workspaceId: WORKSPACE_ID,
      personId: PERSON_ID,
      type: 'UNAVAILABLE',
      startDate: START_DATE,
      endDate: END_DATE,
      createdById: ACTOR_USER_ID,
    })
  })

  it('maps VACATION leaveType to VACATION reason in PersonAvailability', async () => {
    await processLeaveRequest({
      leaveRequestId: LEAVE_REQUEST_ID,
      workspaceId: WORKSPACE_ID,
      actorUserId: ACTOR_USER_ID,
      action: 'approve',
    })

    const createCall = mockPersonAvailabilityCreate.mock.calls[0][0]
    expect(createCall.data.reason).toBe('VACATION')
  })

  it('returns the correct result shape', async () => {
    const result = await processLeaveRequest({
      leaveRequestId: LEAVE_REQUEST_ID,
      workspaceId: WORKSPACE_ID,
      actorUserId: ACTOR_USER_ID,
      action: 'approve',
    })

    expect(result).toEqual({
      status: 'APPROVED',
      personId: PERSON_ID,
      startDate: START_DATE,
      endDate: END_DATE,
    })
  })
})

// ---------------------------------------------------------------------------
// Deny path
// ---------------------------------------------------------------------------

describe('processLeaveRequest — deny', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLeaveRequestFindFirst.mockResolvedValue(makePendingLeaveRequest())
    mockGetProfilePermissions.mockResolvedValue(makePermissions(true))
    mockOrgTeamFindFirst.mockResolvedValue(null)
    mockLeaveRequestUpdate.mockResolvedValue({})
    mockPersonAvailabilityCreate.mockResolvedValue({ id: 'avail-1' })
  })

  it('updates leaveRequest to REJECTED with rejectionReason', async () => {
    await processLeaveRequest({
      leaveRequestId: LEAVE_REQUEST_ID,
      workspaceId: WORKSPACE_ID,
      actorUserId: ACTOR_USER_ID,
      action: 'deny',
      denialReason: 'Insufficient coverage',
    })

    expect(mockLeaveRequestUpdate).toHaveBeenCalledOnce()
    const updateCall = mockLeaveRequestUpdate.mock.calls[0][0]
    expect(updateCall.data.status).toBe('REJECTED')
    expect(updateCall.data.rejectionReason).toBe('Insufficient coverage')
    expect(updateCall.data.rejectedAt).toBeInstanceOf(Date)
  })

  it('does NOT create a PersonAvailability record on deny', async () => {
    await processLeaveRequest({
      leaveRequestId: LEAVE_REQUEST_ID,
      workspaceId: WORKSPACE_ID,
      actorUserId: ACTOR_USER_ID,
      action: 'deny',
      denialReason: 'Not approved',
    })

    expect(mockPersonAvailabilityCreate).not.toHaveBeenCalled()
  })

  it('returns the correct REJECTED result shape', async () => {
    const result = await processLeaveRequest({
      leaveRequestId: LEAVE_REQUEST_ID,
      workspaceId: WORKSPACE_ID,
      actorUserId: ACTOR_USER_ID,
      action: 'deny',
      denialReason: 'Not approved',
    })

    expect(result).toEqual({
      status: 'REJECTED',
      personId: PERSON_ID,
      startDate: START_DATE,
      endDate: END_DATE,
    })
  })

  it('throws LeaveRequestError VALIDATION_ERROR when denialReason is missing', async () => {
    await expect(
      processLeaveRequest({
        leaveRequestId: LEAVE_REQUEST_ID,
        workspaceId: WORKSPACE_ID,
        actorUserId: ACTOR_USER_ID,
        action: 'deny',
      })
    ).rejects.toMatchObject({ name: 'LeaveRequestError', code: 'VALIDATION_ERROR' })
    expect(mockLeaveRequestUpdate).not.toHaveBeenCalled()
  })

  it('throws LeaveRequestError VALIDATION_ERROR when denialReason is whitespace only', async () => {
    await expect(
      processLeaveRequest({
        leaveRequestId: LEAVE_REQUEST_ID,
        workspaceId: WORKSPACE_ID,
        actorUserId: ACTOR_USER_ID,
        action: 'deny',
        denialReason: '   ',
      })
    ).rejects.toMatchObject({ name: 'LeaveRequestError', code: 'VALIDATION_ERROR' })
  })
})

// ---------------------------------------------------------------------------
// Error paths
// ---------------------------------------------------------------------------

describe('processLeaveRequest — error paths', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws LeaveRequestError NOT_FOUND when leave request does not exist', async () => {
    mockLeaveRequestFindFirst.mockResolvedValue(null)

    await expect(
      processLeaveRequest({
        leaveRequestId: 'nonexistent',
        workspaceId: WORKSPACE_ID,
        actorUserId: ACTOR_USER_ID,
        action: 'approve',
      })
    ).rejects.toMatchObject({ name: 'LeaveRequestError', code: 'NOT_FOUND' })
  })

  it('throws LeaveRequestError NOT_PENDING when status is APPROVED', async () => {
    mockLeaveRequestFindFirst.mockResolvedValue(makePendingLeaveRequest({ status: 'APPROVED' }))

    await expect(
      processLeaveRequest({
        leaveRequestId: LEAVE_REQUEST_ID,
        workspaceId: WORKSPACE_ID,
        actorUserId: ACTOR_USER_ID,
        action: 'approve',
      })
    ).rejects.toMatchObject({ name: 'LeaveRequestError', code: 'NOT_PENDING' })
  })

  it('throws LeaveRequestError NOT_PENDING when status is REJECTED', async () => {
    mockLeaveRequestFindFirst.mockResolvedValue(makePendingLeaveRequest({ status: 'REJECTED' }))

    await expect(
      processLeaveRequest({
        leaveRequestId: LEAVE_REQUEST_ID,
        workspaceId: WORKSPACE_ID,
        actorUserId: ACTOR_USER_ID,
        action: 'approve',
      })
    ).rejects.toMatchObject({ name: 'LeaveRequestError', code: 'NOT_PENDING' })
  })

  it('throws LeaveRequestError ACCESS_DENIED when actor lacks permission and is not a team lead', async () => {
    mockLeaveRequestFindFirst.mockResolvedValue(makePendingLeaveRequest())
    mockGetProfilePermissions.mockResolvedValue(makePermissions(false))
    mockOrgTeamFindFirst.mockResolvedValue(null)

    await expect(
      processLeaveRequest({
        leaveRequestId: LEAVE_REQUEST_ID,
        workspaceId: WORKSPACE_ID,
        actorUserId: 'unauthorized-user',
        action: 'approve',
      })
    ).rejects.toMatchObject({ name: 'LeaveRequestError', code: 'ACCESS_DENIED' })
  })

  it('succeeds when actor lacks canApproveTimeOff but IS the team lead', async () => {
    mockLeaveRequestFindFirst.mockResolvedValue(makePendingLeaveRequest())
    mockGetProfilePermissions.mockResolvedValue(makePermissions(false))
    mockOrgTeamFindFirst.mockResolvedValue({ id: 'team-1' }) // IS a team lead
    mockLeaveRequestUpdate.mockResolvedValue({})
    mockPersonAvailabilityCreate.mockResolvedValue({ id: 'avail-1' })

    const result = await processLeaveRequest({
      leaveRequestId: LEAVE_REQUEST_ID,
      workspaceId: WORKSPACE_ID,
      actorUserId: ACTOR_USER_ID,
      action: 'approve',
    })

    expect(result.status).toBe('APPROVED')
  })
})
