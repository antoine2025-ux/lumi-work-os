/**
 * Unit tests for Loopbrain permission infrastructure.
 *
 * Tests role assertions, resource ACL, hierarchy checks, context filtering,
 * and the enrichAgentContext helper. All Prisma calls are mocked.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockOrgPositionFindFirst,
  mockOrgPositionFindMany,
  mockProjectMemberFindUnique,
  mockProjectFindUnique,
  mockProjectFindMany,
  mockProjectMemberFindMany,
  mockSpaceMemberFindFirst,
  mockPersonManagerLinkFindFirst,
  mockPersonManagerLinkFindMany,
  mockOrgTeamFindMany,
  mockWorkspaceMemberFindFirst,
  mockGetProfilePermissions,
} = vi.hoisted(() => ({
  mockOrgPositionFindFirst: vi.fn(),
  mockOrgPositionFindMany: vi.fn(),
  mockProjectMemberFindUnique: vi.fn(),
  mockProjectFindUnique: vi.fn(),
  mockProjectFindMany: vi.fn(),
  mockProjectMemberFindMany: vi.fn(),
  mockSpaceMemberFindFirst: vi.fn(),
  mockPersonManagerLinkFindFirst: vi.fn(),
  mockPersonManagerLinkFindMany: vi.fn(),
  mockOrgTeamFindMany: vi.fn(),
  mockWorkspaceMemberFindFirst: vi.fn(),
  mockGetProfilePermissions: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    orgPosition: {
      findFirst: mockOrgPositionFindFirst,
      findMany: mockOrgPositionFindMany,
    },
    projectMember: {
      findUnique: mockProjectMemberFindUnique,
      findMany: mockProjectMemberFindMany,
    },
    project: {
      findUnique: mockProjectFindUnique,
      findMany: mockProjectFindMany,
    },
    spaceMember: {
      findFirst: mockSpaceMemberFindFirst,
    },
    personManagerLink: {
      findFirst: mockPersonManagerLinkFindFirst,
      findMany: mockPersonManagerLinkFindMany,
    },
    orgTeam: {
      findMany: mockOrgTeamFindMany,
    },
    workspaceMember: {
      findFirst: mockWorkspaceMemberFindFirst,
    },
  },
}))

vi.mock('@/lib/org/permissions/profile-permissions', () => ({
  getProfilePermissions: mockGetProfilePermissions,
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import type { AgentContext } from '../../agent/types'
import {
  assertToolRole,
  hasToolRole,
  enrichAgentContext,
  LoopbrainPermissionError,
} from '../index'
import { assertProjectMembership, assertSpaceMembership, getAccessibleProjectIds } from '../resource-acl'
import { assertHierarchyAccess, getAccessiblePersonIds } from '../hierarchy'
import { filterPersonData, filterCapacityData } from '../context-filter'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    workspaceId: 'ws-1',
    userId: 'user-1',
    workspaceSlug: '',
    userRole: 'MEMBER',
    personId: 'pos-1',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('assertToolRole', () => {
  it('passes when user role meets minimum', () => {
    expect(() => assertToolRole(makeCtx({ userRole: 'ADMIN' }), 'MEMBER')).not.toThrow()
    expect(() => assertToolRole(makeCtx({ userRole: 'MEMBER' }), 'MEMBER')).not.toThrow()
    expect(() => assertToolRole(makeCtx({ userRole: 'OWNER' }), 'ADMIN')).not.toThrow()
  })

  it('throws ROLE_DENIED when user role is insufficient', () => {
    expect(() => assertToolRole(makeCtx({ userRole: 'VIEWER' }), 'MEMBER')).toThrow(
      LoopbrainPermissionError,
    )
    expect(() => assertToolRole(makeCtx({ userRole: 'MEMBER' }), 'ADMIN')).toThrow(
      LoopbrainPermissionError,
    )

    try {
      assertToolRole(makeCtx({ userRole: 'VIEWER' }), 'ADMIN')
    } catch (err) {
      expect(err).toBeInstanceOf(LoopbrainPermissionError)
      expect((err as LoopbrainPermissionError).code).toBe('ROLE_DENIED')
    }
  })
})

describe('hasToolRole', () => {
  it('returns true when role is sufficient', () => {
    expect(hasToolRole(makeCtx({ userRole: 'ADMIN' }), 'MEMBER')).toBe(true)
    expect(hasToolRole(makeCtx({ userRole: 'OWNER' }), 'ADMIN')).toBe(true)
  })

  it('returns false when role is insufficient', () => {
    expect(hasToolRole(makeCtx({ userRole: 'VIEWER' }), 'MEMBER')).toBe(false)
    expect(hasToolRole(makeCtx({ userRole: 'MEMBER' }), 'ADMIN')).toBe(false)
  })
})

describe('enrichAgentContext', () => {
  beforeEach(() => vi.clearAllMocks())

  it('resolves personId from OrgPosition', async () => {
    mockOrgPositionFindFirst.mockResolvedValue({ id: 'pos-42' })
    const ctx = await enrichAgentContext('ws-1', 'user-1', 'MEMBER')
    expect(ctx.personId).toBe('pos-42')
    expect(ctx.userRole).toBe('MEMBER')
    expect(ctx.workspaceId).toBe('ws-1')
  })

  it('returns undefined personId when no org position', async () => {
    mockOrgPositionFindFirst.mockResolvedValue(null)
    const ctx = await enrichAgentContext('ws-1', 'user-1', 'ADMIN')
    expect(ctx.personId).toBeUndefined()
    expect(ctx.userRole).toBe('ADMIN')
  })
})

describe('assertProjectMembership', () => {
  beforeEach(() => vi.clearAllMocks())

  it('passes for ADMIN without DB check', async () => {
    await expect(
      assertProjectMembership(makeCtx({ userRole: 'ADMIN' }), 'proj-1'),
    ).resolves.toBeUndefined()
    expect(mockProjectMemberFindUnique).not.toHaveBeenCalled()
  })

  it('passes when user is project member', async () => {
    mockProjectMemberFindUnique.mockResolvedValue({ id: 'pm-1' })
    await expect(
      assertProjectMembership(makeCtx({ userRole: 'MEMBER' }), 'proj-1'),
    ).resolves.toBeUndefined()
  })

  it('passes when user is project creator', async () => {
    mockProjectMemberFindUnique.mockResolvedValue(null)
    mockProjectFindUnique.mockResolvedValue({ createdById: 'user-1', ownerId: null })
    await expect(
      assertProjectMembership(makeCtx({ userRole: 'MEMBER' }), 'proj-1'),
    ).resolves.toBeUndefined()
  })

  it('throws RESOURCE_DENIED when user has no access', async () => {
    mockProjectMemberFindUnique.mockResolvedValue(null)
    mockProjectFindUnique.mockResolvedValue({ createdById: 'other', ownerId: 'other' })
    await expect(
      assertProjectMembership(makeCtx({ userRole: 'MEMBER' }), 'proj-1'),
    ).rejects.toThrow(LoopbrainPermissionError)
  })
})

describe('assertSpaceMembership', () => {
  beforeEach(() => vi.clearAllMocks())

  it('passes for ADMIN', async () => {
    await expect(
      assertSpaceMembership(makeCtx({ userRole: 'ADMIN' }), 'space-1'),
    ).resolves.toBeUndefined()
  })

  it('passes when user is space member', async () => {
    mockSpaceMemberFindFirst.mockResolvedValue({ id: 'sm-1' })
    await expect(
      assertSpaceMembership(makeCtx({ userRole: 'MEMBER' }), 'space-1'),
    ).resolves.toBeUndefined()
  })

  it('throws RESOURCE_DENIED when user is not space member', async () => {
    mockSpaceMemberFindFirst.mockResolvedValue(null)
    await expect(
      assertSpaceMembership(makeCtx({ userRole: 'MEMBER' }), 'space-1'),
    ).rejects.toThrow(LoopbrainPermissionError)
  })
})

describe('getAccessibleProjectIds', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns all projects for ADMIN', async () => {
    mockProjectFindMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }])
    const ids = await getAccessibleProjectIds(makeCtx({ userRole: 'ADMIN' }))
    expect(ids).toEqual(['p1', 'p2'])
  })

  it('returns member + created projects for MEMBER', async () => {
    mockProjectMemberFindMany.mockResolvedValue([{ projectId: 'p1' }])
    mockProjectFindMany.mockResolvedValue([{ id: 'p2' }])
    const ids = await getAccessibleProjectIds(makeCtx({ userRole: 'MEMBER' }))
    expect(ids).toContain('p1')
    expect(ids).toContain('p2')
  })
})

describe('assertHierarchyAccess', () => {
  beforeEach(() => vi.clearAllMocks())

  it('passes for ADMIN', async () => {
    await expect(
      assertHierarchyAccess(makeCtx({ userRole: 'ADMIN' }), 'target-1'),
    ).resolves.toBeUndefined()
  })

  it('passes for self-access', async () => {
    await expect(
      assertHierarchyAccess(makeCtx({ personId: 'pos-1' }), 'pos-1'),
    ).resolves.toBeUndefined()
  })

  it('passes when user is manager via OrgPosition.parentId', async () => {
    mockOrgPositionFindFirst.mockResolvedValue({ parentId: 'pos-1' })
    mockPersonManagerLinkFindFirst.mockResolvedValue(null)
    mockOrgTeamFindMany.mockResolvedValue([])
    await expect(
      assertHierarchyAccess(makeCtx(), 'target-1'),
    ).resolves.toBeUndefined()
  })

  it('passes when user is manager via PersonManagerLink', async () => {
    mockOrgPositionFindFirst.mockResolvedValue({ parentId: 'other-pos' })
    mockPersonManagerLinkFindFirst.mockResolvedValue({ id: 'link-1' })
    await expect(
      assertHierarchyAccess(makeCtx(), 'target-1'),
    ).resolves.toBeUndefined()
  })

  it('throws HIERARCHY_DENIED when no relationship', async () => {
    mockOrgPositionFindFirst.mockResolvedValue({ parentId: 'other-pos' })
    mockPersonManagerLinkFindFirst.mockResolvedValue(null)
    mockOrgTeamFindMany.mockResolvedValue([])
    await expect(
      assertHierarchyAccess(makeCtx(), 'target-1'),
    ).rejects.toThrow(LoopbrainPermissionError)
  })

  it('throws HIERARCHY_DENIED when user has no personId', async () => {
    await expect(
      assertHierarchyAccess(makeCtx({ personId: undefined }), 'target-1'),
    ).rejects.toThrow(LoopbrainPermissionError)
  })
})

describe('getAccessiblePersonIds', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns all positions for ADMIN', async () => {
    mockOrgPositionFindMany.mockResolvedValue([
      { id: 'pos-1', userId: 'u1' },
      { id: 'pos-2', userId: 'u2' },
    ])
    const ids = await getAccessiblePersonIds(makeCtx({ userRole: 'ADMIN' }))
    expect(ids).toContain('pos-1')
    expect(ids).toContain('u1')
    expect(ids).toContain('pos-2')
    expect(ids).toContain('u2')
  })

  it('returns self + direct reports for MEMBER', async () => {
    // Direct reports via parentId
    mockOrgPositionFindMany
      .mockResolvedValueOnce([{ id: 'pos-report', userId: 'u-report' }])
      // Team members (empty — no led teams)
      .mockResolvedValueOnce([])
    mockPersonManagerLinkFindMany.mockResolvedValue([])
    mockOrgTeamFindMany.mockResolvedValue([])

    const ids = await getAccessiblePersonIds(makeCtx())
    expect(ids).toContain('user-1')
    expect(ids).toContain('pos-1')
    expect(ids).toContain('pos-report')
    expect(ids).toContain('u-report')
  })
})

describe('filterPersonData', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns full data for self-access', async () => {
    const person = { userId: 'user-1', name: 'Me', salary: 100000 }
    const result = await filterPersonData(person, makeCtx())
    expect(result.salary).toBe(100000)
  })

  it('returns full data for ADMIN', async () => {
    const person = { userId: 'other', name: 'Other', salary: 100000 }
    const result = await filterPersonData(person, makeCtx({ userRole: 'ADMIN' }))
    expect(result.salary).toBe(100000)
  })

  it('strips sensitive fields for non-manager MEMBER', async () => {
    mockGetProfilePermissions.mockResolvedValue({
      permissionLevel: 'none',
      canEditField: () => false,
      canRequestTimeOff: false,
      canApproveTimeOff: false,
      canEditCapacity: false,
    })
    const person = { userId: 'other', name: 'Other', salary: 100000, performanceReview: 'good' }
    const result = await filterPersonData(person, makeCtx())
    expect(result.salary).toBeUndefined()
    expect(result.performanceReview).toBeUndefined()
    expect(result.name).toBe('Other')
  })

  it('keeps sensitive fields for manager', async () => {
    mockGetProfilePermissions.mockResolvedValue({
      permissionLevel: 'edit',
      canEditField: () => true,
      canRequestTimeOff: false,
      canApproveTimeOff: true,
      canEditCapacity: true,
    })
    const person = { userId: 'report', name: 'Report', salary: 80000 }
    const result = await filterPersonData(person, makeCtx())
    expect(result.salary).toBe(80000)
  })
})

describe('filterCapacityData', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns full data for self-access', async () => {
    const capacity = { personId: 'user-1', allocation: 80, utilization: 90 }
    const result = await filterCapacityData(capacity, makeCtx())
    expect(result.allocation).toBe(80)
  })

  it('strips sensitive fields for non-manager', async () => {
    mockGetProfilePermissions.mockResolvedValue({
      permissionLevel: 'none',
      canEditField: () => false,
      canRequestTimeOff: false,
      canApproveTimeOff: false,
      canEditCapacity: false,
    })
    const capacity = { personId: 'other', allocation: 80, utilization: 90, billableHours: 40 }
    const result = await filterCapacityData(capacity, makeCtx())
    expect(result.allocation).toBeUndefined()
    expect(result.utilization).toBeUndefined()
    expect(result.billableHours).toBeUndefined()
  })
})
