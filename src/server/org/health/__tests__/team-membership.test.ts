
import { describe, test, expect, vi, beforeEach } from "vitest"

// Mock prisma before importing the module under test
vi.mock("@/lib/db", () => ({
  prisma: {
    orgPosition: {
      findMany: vi.fn(),
    },
  },
}))

import { getTeamMemberships } from "../team-membership"
import { prisma } from "@/lib/db"
import type { OrgPosition } from "@prisma/client"

type FindManyResult = OrgPosition[]

const mockFindMany = vi.mocked(prisma.orgPosition.findMany)

describe("getTeamMemberships", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test("returns memberships from OrgPosition records", async () => {
    mockFindMany.mockResolvedValueOnce([
      { teamId: "team-1", userId: "user-1" },
      { teamId: "team-1", userId: "user-2" },
      { teamId: "team-2", userId: "user-3" },
    ] as unknown as FindManyResult)

    const result = await getTeamMemberships("workspace-123")

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        workspaceId: "workspace-123",
        teamId: { not: null },
        userId: { not: null },
        isActive: true,
      },
      select: {
        teamId: true,
        userId: true,
      },
      take: 50000,
    })

    expect(result).toEqual([
      { teamId: "team-1", personId: "user-1" },
      { teamId: "team-1", personId: "user-2" },
      { teamId: "team-2", personId: "user-3" },
    ])
  })

  test("returns empty array when no positions exist", async () => {
    mockFindMany.mockResolvedValueOnce([] as FindManyResult)

    const result = await getTeamMemberships("workspace-empty")

    expect(result).toEqual([])
  })

  test("filters out positions with null teamId or userId", async () => {
    // Prisma query already filters these, but the code also has a runtime filter
    mockFindMany.mockResolvedValueOnce([
      { teamId: "team-1", userId: "user-1" },
      { teamId: null, userId: "user-2" }, // Should be filtered
      { teamId: "team-2", userId: null }, // Should be filtered
    ] as unknown as FindManyResult)

    const result = await getTeamMemberships("workspace-123")

    // Only the first record should pass the filter
    expect(result).toEqual([{ teamId: "team-1", personId: "user-1" }])
  })

  test("handles large datasets within limit", async () => {
    const manyPositions = Array.from({ length: 100 }, (_, i) => ({
      teamId: `team-${i % 10}`,
      userId: `user-${i}`,
    }))

    mockFindMany.mockResolvedValueOnce(manyPositions as unknown as FindManyResult)

    const result = await getTeamMemberships("workspace-large")

    expect(result.length).toBe(100)
    expect(result[0]).toEqual({ teamId: "team-0", personId: "user-0" })
    expect(result[99]).toEqual({ teamId: "team-9", personId: "user-99" })
  })
})
