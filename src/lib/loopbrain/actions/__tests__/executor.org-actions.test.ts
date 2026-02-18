/**
 * Unit tests for org-specific executor actions in executor.ts
 *
 * Tests executeOrgAssignManager, executeOrgUpdateCapacity, executeOrgCreatePerson
 * via the public executeAction() entry point.
 *
 * All Prisma calls and dependencies are mocked — no real DB is hit.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// vi.hoisted: all mock functions must be declared here so vi.mock factories
// can reference them (vi.mock is hoisted before const declarations)
// ---------------------------------------------------------------------------

const {
  mockWorkspaceMemberFindFirst,
  mockUserFindFirst,
  mockPersonManagerLinkFindFirst,
  mockPersonManagerLinkCreate,
  mockCapacityContractUpdateMany,
  mockCapacityContractCreate,
  mockOrgPositionFindFirst,
  mockProjectFindFirst,
  mockProjectMemberUpsert,
  mockOrgTeamFindFirst,
  mockIndexOne,
  mockCreateOrgPerson,
  mockUpsertIntegrationAllocation,
  mockProcessLeaveRequest,
} = vi.hoisted(() => ({
  mockWorkspaceMemberFindFirst: vi.fn(),
  mockUserFindFirst: vi.fn(),
  mockPersonManagerLinkFindFirst: vi.fn(),
  mockPersonManagerLinkCreate: vi.fn(),
  mockCapacityContractUpdateMany: vi.fn(),
  mockCapacityContractCreate: vi.fn(),
  mockOrgPositionFindFirst: vi.fn(),
  mockProjectFindFirst: vi.fn(),
  mockProjectMemberUpsert: vi.fn(),
  mockOrgTeamFindFirst: vi.fn(),
  mockIndexOne: vi.fn(),
  mockCreateOrgPerson: vi.fn(),
  mockUpsertIntegrationAllocation: vi.fn(),
  mockProcessLeaveRequest: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    workspaceMember: { findFirst: mockWorkspaceMemberFindFirst },
    user: { findFirst: mockUserFindFirst },
    personManagerLink: {
      findFirst: mockPersonManagerLinkFindFirst,
      create: mockPersonManagerLinkCreate,
    },
    capacityContract: {
      updateMany: mockCapacityContractUpdateMany,
      create: mockCapacityContractCreate,
    },
    orgPosition: { findFirst: mockOrgPositionFindFirst },
    project: { findFirst: mockProjectFindFirst },
    projectMember: { upsert: mockProjectMemberUpsert },
    orgTeam: { findFirst: mockOrgTeamFindFirst },
  },
}))

vi.mock('@/lib/loopbrain/indexing/indexer', () => ({
  indexOne: mockIndexOne,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/server/org/people/write', () => ({
  createOrgPerson: mockCreateOrgPerson,
}))

vi.mock('@/lib/org/capacity/project-capacity', () => ({
  upsertIntegrationAllocation: mockUpsertIntegrationAllocation,
}))

vi.mock('@/server/org/leave/process-leave-request', () => ({
  processLeaveRequest: mockProcessLeaveRequest,
  LeaveRequestError: class LeaveRequestError extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message)
      this.name = 'LeaveRequestError'
    }
  },
}))

import { executeAction } from '../executor'

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const WORKSPACE_ID = 'ws-1'
const ACTOR_ID = 'admin-1'
const MANAGER_ID = 'manager-1'
const REPORT_ID = 'report-1'
const PERSON_ID = 'person-1'

const adminMember = { role: 'ADMIN' }
const memberMember = { role: 'MEMBER' }

// ---------------------------------------------------------------------------
// executeOrgAssignManager
// ---------------------------------------------------------------------------

describe('executeAction — org.assign_manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIndexOne.mockResolvedValue(undefined)
  })

  it('creates a PersonManagerLink and returns success with names', async () => {
    mockWorkspaceMemberFindFirst.mockResolvedValue(adminMember)
    mockUserFindFirst
      .mockResolvedValueOnce({ id: MANAGER_ID, name: 'Alice Manager' })
      .mockResolvedValueOnce({ id: REPORT_ID, name: 'Bob Report' })
    mockPersonManagerLinkFindFirst.mockResolvedValue(null)
    mockPersonManagerLinkCreate.mockResolvedValue({ id: 'link-1' })

    const result = await executeAction({
      action: { type: 'org.assign_manager', managerId: MANAGER_ID, reportId: REPORT_ID },
      workspaceId: WORKSPACE_ID,
      userId: ACTOR_ID,
    })

    expect(result.ok).toBe(true)
    expect(result.result?.actionType).toBe('org.assign_manager')
    expect(result.result?.message).toContain('Alice Manager')
    expect(result.result?.message).toContain('Bob Report')

    expect(mockPersonManagerLinkCreate).toHaveBeenCalledOnce()
    expect(mockPersonManagerLinkCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          managerId: MANAGER_ID,
          personId: REPORT_ID,
        }),
        select: { id: true },
      })
    )
  })

  it('returns error on self-assignment without calling create', async () => {
    mockWorkspaceMemberFindFirst.mockResolvedValue(adminMember)

    const result = await executeAction({
      action: { type: 'org.assign_manager', managerId: PERSON_ID, reportId: PERSON_ID },
      workspaceId: WORKSPACE_ID,
      userId: ACTOR_ID,
    })

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('BAD_REQUEST')
    expect(mockPersonManagerLinkCreate).not.toHaveBeenCalled()
  })

  it('returns no-op message when link already exists, without calling create', async () => {
    mockWorkspaceMemberFindFirst.mockResolvedValue(adminMember)
    mockUserFindFirst
      .mockResolvedValueOnce({ id: MANAGER_ID, name: 'Alice Manager' })
      .mockResolvedValueOnce({ id: REPORT_ID, name: 'Bob Report' })
    mockPersonManagerLinkFindFirst.mockResolvedValue({ id: 'link-existing' })

    const result = await executeAction({
      action: { type: 'org.assign_manager', managerId: MANAGER_ID, reportId: REPORT_ID },
      workspaceId: WORKSPACE_ID,
      userId: ACTOR_ID,
    })

    expect(result.ok).toBe(true)
    expect(result.result?.message).toContain('already')
    expect(mockPersonManagerLinkCreate).not.toHaveBeenCalled()
  })

  it('returns ACCESS_DENIED when actor is MEMBER (not ADMIN/OWNER)', async () => {
    mockWorkspaceMemberFindFirst.mockResolvedValue(memberMember)

    const result = await executeAction({
      action: { type: 'org.assign_manager', managerId: MANAGER_ID, reportId: REPORT_ID },
      workspaceId: WORKSPACE_ID,
      userId: ACTOR_ID,
    })

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('ACCESS_DENIED')
    expect(mockPersonManagerLinkCreate).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// executeOrgUpdateCapacity
// ---------------------------------------------------------------------------

describe('executeAction — org.update_capacity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIndexOne.mockResolvedValue(undefined)
  })

  it('closes open contract then creates a new one with correct values', async () => {
    mockWorkspaceMemberFindFirst.mockResolvedValue(adminMember)
    mockUserFindFirst.mockResolvedValue({ id: PERSON_ID, name: 'Jane Doe' })
    mockCapacityContractUpdateMany.mockResolvedValue({ count: 1 })
    mockCapacityContractCreate.mockResolvedValue({ id: 'contract-new' })

    const result = await executeAction({
      action: { type: 'org.update_capacity', personId: PERSON_ID, weeklyCapacityHours: 32 },
      workspaceId: WORKSPACE_ID,
      userId: ACTOR_ID,
    })

    expect(result.ok).toBe(true)
    expect(result.result?.message).toContain('32h/week')
    expect(result.result?.message).toContain('Jane Doe')

    // updateMany: close open contracts
    expect(mockCapacityContractUpdateMany).toHaveBeenCalledOnce()
    const updateCall = mockCapacityContractUpdateMany.mock.calls[0][0]
    expect(updateCall.where).toMatchObject({
      workspaceId: WORKSPACE_ID,
      personId: PERSON_ID,
      effectiveTo: null,
    })
    // effectiveTo is set to yesterday (midnight) — verify it's yesterday's date
    const effectiveTo = updateCall.data.effectiveTo as Date
    expect(effectiveTo).toBeInstanceOf(Date)
    const expectedYesterday = new Date()
    expectedYesterday.setDate(expectedYesterday.getDate() - 1)
    expect(effectiveTo.getFullYear()).toBe(expectedYesterday.getFullYear())
    expect(effectiveTo.getMonth()).toBe(expectedYesterday.getMonth())
    expect(effectiveTo.getDate()).toBe(expectedYesterday.getDate())

    // create: new open-ended contract
    expect(mockCapacityContractCreate).toHaveBeenCalledOnce()
    const createCall = mockCapacityContractCreate.mock.calls[0][0]
    expect(createCall.data).toMatchObject({
      workspaceId: WORKSPACE_ID,
      personId: PERSON_ID,
      weeklyCapacityHours: 32,
      effectiveTo: null,
      createdById: ACTOR_ID,
    })
    // effectiveFrom is set to today midnight — verify it's today's date
    const effectiveFrom = createCall.data.effectiveFrom as Date
    expect(effectiveFrom).toBeInstanceOf(Date)
    const expectedToday = new Date()
    expect(effectiveFrom.getFullYear()).toBe(expectedToday.getFullYear())
    expect(effectiveFrom.getMonth()).toBe(expectedToday.getMonth())
    expect(effectiveFrom.getDate()).toBe(expectedToday.getDate())
  })

  it('returns ACCESS_DENIED when actor is MEMBER (not ADMIN/OWNER)', async () => {
    mockWorkspaceMemberFindFirst.mockResolvedValue(memberMember)

    const result = await executeAction({
      action: { type: 'org.update_capacity', personId: PERSON_ID, weeklyCapacityHours: 32 },
      workspaceId: WORKSPACE_ID,
      userId: ACTOR_ID,
    })

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('ACCESS_DENIED')
    expect(mockCapacityContractCreate).not.toHaveBeenCalled()
  })

  it('returns BAD_REQUEST when person does not exist in workspace', async () => {
    mockWorkspaceMemberFindFirst.mockResolvedValue(adminMember)
    mockUserFindFirst.mockResolvedValue(null)

    const result = await executeAction({
      action: { type: 'org.update_capacity', personId: 'nonexistent', weeklyCapacityHours: 40 },
      workspaceId: WORKSPACE_ID,
      userId: ACTOR_ID,
    })

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('BAD_REQUEST')
    expect(mockCapacityContractCreate).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// executeOrgCreatePerson
// ---------------------------------------------------------------------------

describe('executeAction — org.create_person', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIndexOne.mockResolvedValue(undefined)
  })

  it('creates person and returns confirmation with full name', async () => {
    mockWorkspaceMemberFindFirst.mockResolvedValue(adminMember)
    mockOrgTeamFindFirst.mockResolvedValue(null)
    mockCreateOrgPerson.mockResolvedValue({ id: 'pos-1', userId: 'user-new' })

    const result = await executeAction({
      action: { type: 'org.create_person', fullName: 'Charlie New' },
      workspaceId: WORKSPACE_ID,
      userId: ACTOR_ID,
    })

    expect(result.ok).toBe(true)
    expect(result.result?.message).toContain('Charlie New')
    expect(result.result?.entityId).toBe('pos-1')

    expect(mockCreateOrgPerson).toHaveBeenCalledOnce()
    expect(mockCreateOrgPerson).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WORKSPACE_ID,
        fullName: 'Charlie New',
      })
    )
  })

  it('includes team name in confirmation message when teamId is provided', async () => {
    mockWorkspaceMemberFindFirst.mockResolvedValue(adminMember)
    mockOrgTeamFindFirst.mockResolvedValue({ name: 'Engineering' })
    mockCreateOrgPerson.mockResolvedValue({ id: 'pos-2', userId: 'user-new-2' })

    const result = await executeAction({
      action: {
        type: 'org.create_person',
        fullName: 'Dana Engineer',
        teamId: 'team-eng',
      },
      workspaceId: WORKSPACE_ID,
      userId: ACTOR_ID,
    })

    expect(result.ok).toBe(true)
    expect(result.result?.message).toContain('Dana Engineer')
    expect(result.result?.message).toContain('Engineering')
  })

  it('returns ACCESS_DENIED when actor is MEMBER (not ADMIN/OWNER)', async () => {
    mockWorkspaceMemberFindFirst.mockResolvedValue(memberMember)

    const result = await executeAction({
      action: { type: 'org.create_person', fullName: 'Someone New' },
      workspaceId: WORKSPACE_ID,
      userId: ACTOR_ID,
    })

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('ACCESS_DENIED')
    expect(mockCreateOrgPerson).not.toHaveBeenCalled()
  })
})
