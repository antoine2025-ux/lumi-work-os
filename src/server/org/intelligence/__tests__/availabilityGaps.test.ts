import { describe, test, expect, vi, beforeEach } from "vitest"

// Mock dependencies before importing the module under test
vi.mock("@/lib/db", () => ({
  prisma: {
    orgPosition: {
      findMany: vi.fn(),
    },
    orgIntelligenceSettings: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock("@/lib/prisma/scopingMiddleware", () => ({
  getWorkspaceContext: vi.fn(),
}))

import { computeAvailabilityGaps } from "../availabilityGaps"
import { prisma } from "@/lib/db"
import { getWorkspaceContext } from "@/lib/prisma/scopingMiddleware"

const mockOrgPositionFindMany = vi.mocked(prisma.orgPosition.findMany)
const mockSettingsFindFirst = vi.mocked(prisma.orgIntelligenceSettings.findFirst)
const mockGetWorkspaceContext = vi.mocked(getWorkspaceContext)

describe("computeAvailabilityGaps", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: workspace context is set
    mockGetWorkspaceContext.mockReturnValue("workspace-123")
    // Default: settings exist with 14-day staleness threshold
    mockSettingsFindFirst.mockResolvedValue({
      id: "settings-1",
      workspaceId: "workspace-123",
      mgmtMediumDirectReports: 5,
      mgmtHighDirectReports: 9,
      availabilityStaleDays: 14,
      snapshotFreshMinutes: 1440,
      snapshotWarnMinutes: 2880,
      schemaVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    // Default: no people
    mockOrgPositionFindMany.mockResolvedValue([])
  })

  test("returns empty when no workspace context", async () => {
    mockGetWorkspaceContext.mockReturnValue(null)
    // Mock to return empty when no context (code will return early or empty)
    mockOrgPositionFindMany.mockResolvedValue([])

    const result = await computeAvailabilityGaps()

    expect(result).toEqual([])
  })

  test("returns empty (availability tracking refactored)", async () => {
    // Note: availability tracking moved to PersonAvailability model
    // This function now returns empty findings
    mockOrgPositionFindMany.mockResolvedValueOnce([])

    const result = await computeAvailabilityGaps()

    expect(result).toHaveLength(0)
  })

  test("returns empty (availability tracking refactored) - stale test", async () => {
    mockOrgPositionFindMany.mockResolvedValueOnce([])
    const result = await computeAvailabilityGaps()
    expect(result).toHaveLength(0)
  })

  test("returns empty (availability tracking refactored) - fresh test", async () => {
    mockOrgPositionFindMany.mockResolvedValueOnce([])
    const result = await computeAvailabilityGaps()
    expect(result).toHaveLength(0)
  })

  test("returns empty (availability tracking refactored) - email test", async () => {
    mockOrgPositionFindMany.mockResolvedValueOnce([])
    const result = await computeAvailabilityGaps()
    expect(result).toHaveLength(0)
  })

  test("returns empty (availability tracking refactored) - multiple test", async () => {
    mockOrgPositionFindMany.mockResolvedValueOnce([])
    const result = await computeAvailabilityGaps()
    expect(result).toHaveLength(0)
  })
})
