import { describe, test, expect, vi, beforeEach } from "vitest"

// Mock dependencies before importing the module under test
vi.mock("@/lib/db", () => ({
  prisma: {
    personAvailabilityHealth: {
      findMany: vi.fn(),
    },
    user: {
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

const mockAvailabilityFindMany = vi.mocked(prisma.personAvailabilityHealth.findMany)
const mockUserFindMany = vi.mocked(prisma.user.findMany)
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
  })

  test("returns empty when no workspace context", async () => {
    mockGetWorkspaceContext.mockReturnValue(null)

    const result = await computeAvailabilityGaps()

    expect(result).toEqual([])
    expect(mockAvailabilityFindMany).not.toHaveBeenCalled()
  })

  test("returns finding for UNAVAILABLE status", async () => {
    mockAvailabilityFindMany.mockResolvedValueOnce([
      {
        id: "avail-1",
        personId: "user-1",
        status: "UNAVAILABLE",
        reason: "On leave",
        updatedAt: new Date(),
        expectedReturnDate: new Date("2026-02-01"),
        workspaceId: "workspace-123",
        startsAt: null,
        endsAt: null,
        createdAt: new Date(),
      },
    ])
    mockUserFindMany.mockResolvedValueOnce([
      { id: "user-1", name: "Alice Smith", email: "alice@example.com" },
    ])

    const result = await computeAvailabilityGaps()

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      signal: "STRUCTURAL_GAP",
      severity: "MEDIUM",
      entityType: "PERSON",
      entityId: "user-1",
      title: "Person unavailable",
    })
    expect(result[0].explanation).toContain("Alice Smith")
    expect(result[0].explanation).toContain("On leave")
  })

  test("returns finding for stale availability (older than threshold)", async () => {
    // Create a date 20 days ago (beyond 14-day threshold)
    const staleDate = new Date()
    staleDate.setDate(staleDate.getDate() - 20)

    mockAvailabilityFindMany.mockResolvedValueOnce([
      {
        id: "avail-2",
        personId: "user-2",
        status: "AVAILABLE",
        reason: null,
        updatedAt: staleDate,
        expectedReturnDate: null,
        workspaceId: "workspace-123",
        startsAt: null,
        endsAt: null,
        createdAt: staleDate,
      },
    ])
    mockUserFindMany.mockResolvedValueOnce([
      { id: "user-2", name: "Bob Jones", email: "bob@example.com" },
    ])

    const result = await computeAvailabilityGaps()

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      signal: "STRUCTURAL_GAP",
      severity: "LOW",
      entityType: "PERSON",
      entityId: "user-2",
      title: "Availability stale",
    })
    expect(result[0].explanation).toContain("Bob Jones")
    expect(result[0].explanation).toContain("14+ days")
  })

  test("returns no findings for fresh AVAILABLE status", async () => {
    // Fresh update (within 14 days)
    const freshDate = new Date()
    freshDate.setDate(freshDate.getDate() - 5)

    mockAvailabilityFindMany.mockResolvedValueOnce([
      {
        id: "avail-3",
        personId: "user-3",
        status: "AVAILABLE",
        reason: null,
        updatedAt: freshDate,
        expectedReturnDate: null,
        workspaceId: "workspace-123",
        startsAt: null,
        endsAt: null,
        createdAt: freshDate,
      },
    ])
    mockUserFindMany.mockResolvedValueOnce([
      { id: "user-3", name: "Carol White", email: "carol@example.com" },
    ])

    const result = await computeAvailabilityGaps()

    expect(result).toHaveLength(0)
  })

  test("uses email when user name is null", async () => {
    mockAvailabilityFindMany.mockResolvedValueOnce([
      {
        id: "avail-4",
        personId: "user-4",
        status: "UNAVAILABLE",
        reason: null,
        updatedAt: new Date(),
        expectedReturnDate: null,
        workspaceId: "workspace-123",
        startsAt: null,
        endsAt: null,
        createdAt: new Date(),
      },
    ])
    mockUserFindMany.mockResolvedValueOnce([
      { id: "user-4", name: null, email: "noname@example.com" },
    ])

    const result = await computeAvailabilityGaps()

    expect(result).toHaveLength(1)
    expect(result[0].explanation).toContain("noname@example.com")
  })

  test("handles multiple findings in single query", async () => {
    const staleDate = new Date()
    staleDate.setDate(staleDate.getDate() - 20)

    mockAvailabilityFindMany.mockResolvedValueOnce([
      {
        id: "avail-1",
        personId: "user-1",
        status: "UNAVAILABLE",
        reason: "Sick",
        updatedAt: new Date(),
        expectedReturnDate: null,
        workspaceId: "workspace-123",
        startsAt: null,
        endsAt: null,
        createdAt: new Date(),
      },
      {
        id: "avail-2",
        personId: "user-2",
        status: "AVAILABLE",
        reason: null,
        updatedAt: staleDate,
        expectedReturnDate: null,
        workspaceId: "workspace-123",
        startsAt: null,
        endsAt: null,
        createdAt: staleDate,
      },
      {
        id: "avail-3",
        personId: "user-3",
        status: "AVAILABLE",
        reason: null,
        updatedAt: new Date(),
        expectedReturnDate: null,
        workspaceId: "workspace-123",
        startsAt: null,
        endsAt: null,
        createdAt: new Date(),
      },
    ])
    mockUserFindMany.mockResolvedValueOnce([
      { id: "user-1", name: "Alice", email: "alice@example.com" },
      { id: "user-2", name: "Bob", email: "bob@example.com" },
      { id: "user-3", name: "Carol", email: "carol@example.com" },
    ])

    const result = await computeAvailabilityGaps()

    // Should have 2 findings: UNAVAILABLE + stale
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.entityId)).toEqual(["user-1", "user-2"])
  })
})
