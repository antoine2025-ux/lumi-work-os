/**
 * Unit tests for src/lib/org/capacity/project-capacity.ts
 *
 * All Prisma interactions are mocked — no real database is hit.
 * Tests verify correct filter arguments and idempotency guarantees.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AllocationSource } from '@prisma/client'

// vi.hoisted ensures mock functions are available when vi.mock factory runs
const {
  mockFindFirst,
  mockCreate,
  mockDeleteMany,
  mockUpdateMany,
  mockProjectFindUnique,
} = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockCreate: vi.fn(),
  mockDeleteMany: vi.fn(),
  mockUpdateMany: vi.fn(),
  mockProjectFindUnique: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    workAllocation: {
      findFirst: mockFindFirst,
      create: mockCreate,
      deleteMany: mockDeleteMany,
      updateMany: mockUpdateMany,
    },
    project: {
      findUnique: mockProjectFindUnique,
    },
  },
}))

vi.mock('@/lib/org/capacity/read', () => ({
  getCapacityContracts: vi.fn(),
  resolveContractForWindow: vi.fn(),
  DEFAULT_WEEKLY_CAPACITY_HOURS: 40,
}))

vi.mock('@/lib/org/allocations', () => ({
  getWorkAllocations: vi.fn(),
  computeTotalAllocatedHoursForWindow: vi.fn(),
}))

import {
  upsertIntegrationAllocation,
  removeIntegrationAllocation,
  closeIntegrationAllocations,
} from '../project-capacity'

const WORKSPACE_ID = 'ws-1'
const USER_ID = 'user-1'
const PROJECT_ID = 'proj-1'
const CREATED_BY_ID = 'admin-1'

const mockProject = { name: 'Alpha Project', endDate: null }

describe('upsertIntegrationAllocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProjectFindUnique.mockResolvedValue(mockProject)
    mockCreate.mockResolvedValue({ id: 'alloc-1' })
  })

  it('creates an INTEGRATION allocation when none exists', async () => {
    mockFindFirst.mockResolvedValue(null)

    await upsertIntegrationAllocation(WORKSPACE_ID, USER_ID, PROJECT_ID, CREATED_BY_ID)

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        workspaceId: WORKSPACE_ID,
        personId: USER_ID,
        contextType: 'PROJECT',
        contextId: PROJECT_ID,
      },
      select: { id: true },
    })

    expect(mockCreate).toHaveBeenCalledOnce()
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: WORKSPACE_ID,
          personId: USER_ID,
          contextId: PROJECT_ID,
          source: AllocationSource.INTEGRATION,
          allocationPercent: 0.25,
          createdById: CREATED_BY_ID,
        }),
      })
    )
  })

  it('is idempotent — does not create a second INTEGRATION allocation', async () => {
    mockFindFirst.mockResolvedValue({ id: 'alloc-existing' })

    await upsertIntegrationAllocation(WORKSPACE_ID, USER_ID, PROJECT_ID, CREATED_BY_ID)

    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('does not overwrite an existing MANUAL allocation', async () => {
    // The function checks for ANY existing allocation (not just INTEGRATION),
    // so a MANUAL allocation also prevents creation.
    mockFindFirst.mockResolvedValue({ id: 'alloc-manual', source: AllocationSource.MANUAL })

    await upsertIntegrationAllocation(WORKSPACE_ID, USER_ID, PROJECT_ID, CREATED_BY_ID)

    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe('removeIntegrationAllocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteMany.mockResolvedValue({ count: 1 })
  })

  it('deletes only INTEGRATION allocations for the person+project', async () => {
    await removeIntegrationAllocation(WORKSPACE_ID, USER_ID, PROJECT_ID)

    expect(mockDeleteMany).toHaveBeenCalledOnce()
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: {
        workspaceId: WORKSPACE_ID,
        personId: USER_ID,
        contextType: 'PROJECT',
        contextId: PROJECT_ID,
        source: AllocationSource.INTEGRATION,
      },
    })
  })

  it('excludes MANUAL allocations — the filter specifies source: INTEGRATION', async () => {
    await removeIntegrationAllocation(WORKSPACE_ID, USER_ID, PROJECT_ID)

    const callArg = mockDeleteMany.mock.calls[0][0]
    expect(callArg.where.source).toBe(AllocationSource.INTEGRATION)
  })
})

describe('closeIntegrationAllocations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateMany.mockResolvedValue({ count: 2 })
  })

  it('sets endDate≈today on open INTEGRATION allocations for the project', async () => {
    const before = new Date()
    await closeIntegrationAllocations(WORKSPACE_ID, PROJECT_ID)
    const after = new Date()

    expect(mockUpdateMany).toHaveBeenCalledOnce()
    const callArg = mockUpdateMany.mock.calls[0][0]

    expect(callArg.where).toMatchObject({
      workspaceId: WORKSPACE_ID,
      contextType: 'PROJECT',
      contextId: PROJECT_ID,
      source: AllocationSource.INTEGRATION,
      endDate: null,
    })

    const setEndDate = callArg.data.endDate as Date
    expect(setEndDate).toBeInstanceOf(Date)
    expect(setEndDate.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000)
    expect(setEndDate.getTime()).toBeLessThanOrEqual(after.getTime() + 1000)
  })

  it('excludes MANUAL allocations — the filter specifies source: INTEGRATION', async () => {
    await closeIntegrationAllocations(WORKSPACE_ID, PROJECT_ID)
    const callArg = mockUpdateMany.mock.calls[0][0]
    expect(callArg.where.source).toBe(AllocationSource.INTEGRATION)
  })

  it('only targets open allocations — the filter requires endDate: null', async () => {
    await closeIntegrationAllocations(WORKSPACE_ID, PROJECT_ID)
    const callArg = mockUpdateMany.mock.calls[0][0]
    expect(callArg.where.endDate).toBeNull()
  })
})
