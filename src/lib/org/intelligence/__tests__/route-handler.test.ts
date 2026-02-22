/**
 * Route Handler Tests
 *
 * TRUE route-level tests that call the actual exported GET handlers.
 * This is the ONLY test that proves routes can't drift from the resolver.
 *
 * Mocks:
 * - getUnifiedAuth (auth)
 * - assertAccess (authorization)
 * - setWorkspaceContext (prisma scoping)
 * - prisma counts (for overview)
 * - getOrgIntelligenceSnapshot (for overview)
 * - getOrgOwnership (for ownership)
 *
 * Asserts:
 * - Overview unowned count === Ownership unowned count
 * - Overview unowned count === snapshot.ownership.unownedEntities.length
 * - Both endpoints return expected response shapes
 * - Default version and ?version=v2 behave identically
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  createSnapshotMeta,
} from "../snapshotTypes";

// ============================================================================
// Test Data - Shared between both routes
// ============================================================================

// This is the canonical unowned count that BOTH routes must return
const EXPECTED_UNOWNED_COUNT = 3;

// Mock unowned entities that the snapshot returns
const mockUnownedEntities = [
  { type: "team" as const, id: "team-2", name: "Team 2" },
  { type: "team" as const, id: "team-3", name: "Team 3" },
  { type: "department" as const, id: "dept-2", name: "Dept 2" },
];

// Mock issues (aggregated - fewer than unowned entities)
const mockIssues = [
  { code: "OWNERSHIP_UNOWNED_TEAM", severity: "warning", title: "2 teams need owners" },
  { code: "OWNERSHIP_UNOWNED_DEPARTMENT", severity: "warning", title: "1 department needs owner" },
];

// Mock snapshot returned by getOrgIntelligenceSnapshot
const mockSnapshot = {
  ownership: {
    coverage: {
      teams: { total: 3, owned: 1, unowned: 2, percent: 33 },
      departments: { total: 2, owned: 1, unowned: 1, percent: 50 },
      overallPercent: 40,
    },
    unownedEntities: mockUnownedEntities,
    unassignedTeamsExcludedFromCoverage: [],
    conflicts: [],
    ownershipByEntity: {},
    issues: mockIssues,
  },
  structure: {
    departments: [],
    teamsByDepartment: {},
    unassignedTeams: [],
    departmentsWithoutTeams: [],
    teamsWithoutPeople: [],
    peopleWithoutTeams: [],
    issues: [],
  },
  _meta: createSnapshotMeta(),
};

// Mock DTO returned by getOrgOwnership
const mockOwnershipDTO = {
  coverage: {
    teams: { total: 3, owned: 1, unowned: 2 },
    departments: { total: 2, owned: 1, unowned: 1 },
  },
  unowned: mockUnownedEntities.map((e) => ({
    entityType: e.type.toUpperCase(),
    entityId: e.id,
    name: e.name,
    departmentName: null,
    suggestedOwnerPersonId: null,
  })),
  assignments: [],
};

// ============================================================================
// Mocks - Must be before any imports that use them
// ============================================================================

vi.mock("@/lib/unified-auth", () => ({
  getUnifiedAuth: vi.fn().mockResolvedValue({
    user: { userId: "user-1" },
    workspaceId: "workspace-1",
  }),
}));

vi.mock("@/lib/auth/assertAccess", () => ({
  assertAccess: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma/scopingMiddleware", () => ({
  setWorkspaceContext: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    orgPosition: { count: vi.fn().mockResolvedValue(10) },
    orgTeam: { count: vi.fn().mockResolvedValue(3) },
    orgDepartment: { count: vi.fn().mockResolvedValue(2) },
  },
}));

vi.mock("@/lib/org/intelligence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../index")>();
  return {
    ...actual,
    getOrgIntelligenceSnapshot: vi.fn().mockResolvedValue(mockSnapshot),
  };
});

vi.mock("@/server/org/ownership/read", () => ({
  getOrgOwnership: vi.fn().mockResolvedValue(mockOwnershipDTO),
}));

// ============================================================================
// Import Routes AFTER mocks are set up
// ============================================================================

// Dynamic import to ensure mocks are applied
let getOverview: (req: NextRequest) => Promise<Response>;
let getOwnership: (req: NextRequest) => Promise<Response>;

beforeAll(async () => {
  const overviewModule = await import("@/app/api/org/overview/route");
  const ownershipModule = await import("@/app/api/org/ownership/route");
  getOverview = overviewModule.GET;
  getOwnership = ownershipModule.GET;
});

// ============================================================================
// Helper Functions
// ============================================================================

function createRequest(path: string, version?: string): NextRequest {
  const url = version
    ? `http://localhost:3000${path}?version=${version}`
    : `http://localhost:3000${path}`;
  return new NextRequest(url);
}

// ============================================================================
// Tests
// ============================================================================

describe("Route Handler Contract: Overview vs Ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Overview unowned count equals Ownership unowned count (default version)", async () => {
    const overviewRes = await getOverview(createRequest("/api/org/overview"));
    const ownershipRes = await getOwnership(createRequest("/api/org/ownership"));

    expect(overviewRes.status).toBe(200);
    expect(ownershipRes.status).toBe(200);

    const overviewData = await overviewRes.json();
    const ownershipData = await ownershipRes.json();

    // CRITICAL CONTRACT: These must be equal
    const overviewUnowned = overviewData.summary.unownedEntities;
    const ownershipUnowned = ownershipData.unowned.length;
    const ownershipCoverage =
      ownershipData.coverage.teams.unowned +
      ownershipData.coverage.departments.unowned;

    expect(overviewUnowned).toBe(EXPECTED_UNOWNED_COUNT);
    expect(ownershipUnowned).toBe(EXPECTED_UNOWNED_COUNT);
    expect(ownershipCoverage).toBe(EXPECTED_UNOWNED_COUNT);
  });

  it("Overview unowned count equals Ownership unowned count (?version=v2)", async () => {
    const overviewRes = await getOverview(createRequest("/api/org/overview", "v2"));
    const ownershipRes = await getOwnership(createRequest("/api/org/ownership", "v2"));

    expect(overviewRes.status).toBe(200);
    expect(ownershipRes.status).toBe(200);

    const overviewData = await overviewRes.json();
    const ownershipData = await ownershipRes.json();

    // Same contract for v2
    const overviewUnowned = overviewData.summary.unownedEntities;
    const ownershipUnowned = ownershipData.unowned.length;

    expect(overviewUnowned).toBe(EXPECTED_UNOWNED_COUNT);
    expect(ownershipUnowned).toBe(EXPECTED_UNOWNED_COUNT);
  });

  it("Overview derives count from unownedEntities.length, not issues.length", async () => {
    const res = await getOverview(createRequest("/api/org/overview"));
    const data = await res.json();

    // The mock has 3 unowned entities but only 2 issues (aggregated)
    // Overview MUST return 3, not 2
    expect(data.summary.unownedEntities).toBe(mockUnownedEntities.length);
    expect(data.summary.unownedEntities).not.toBe(mockIssues.length);
  });

  it("Ownership unowned array equals unownedEntities, not issues", async () => {
    const res = await getOwnership(createRequest("/api/org/ownership"));
    const data = await res.json();

    // Ownership unowned array must have same length as unownedEntities
    expect(data.unowned.length).toBe(mockUnownedEntities.length);
    expect(data.unowned.length).not.toBe(mockIssues.length);
  });
});

describe("Route Handler Contract: Response Shapes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Overview has expected response shape", async () => {
    const res = await getOverview(createRequest("/api/org/overview"));
    const data = await res.json();

    expect(res.status).toBe(200);

    // Required fields
    expect(data).toHaveProperty("summary");
    expect(data.summary).toHaveProperty("unownedEntities");
    expect(data.summary).toHaveProperty("peopleCount");
    expect(data.summary).toHaveProperty("teamCount");
    expect(data.summary).toHaveProperty("deptCount");
    expect(data).toHaveProperty("readiness");

    // Types
    expect(typeof data.summary.unownedEntities).toBe("number");
    expect(data.summary.unownedEntities).toBeGreaterThanOrEqual(0);
  });

  it("Ownership has expected response shape", async () => {
    const res = await getOwnership(createRequest("/api/org/ownership"));
    const data = await res.json();

    expect(res.status).toBe(200);

    // Required fields
    expect(data).toHaveProperty("coverage");
    expect(data.coverage).toHaveProperty("teams");
    expect(data.coverage).toHaveProperty("departments");
    expect(data).toHaveProperty("unowned");
    expect(data).toHaveProperty("assignments");

    // Types
    expect(Array.isArray(data.unowned)).toBe(true);
    expect(Array.isArray(data.assignments)).toBe(true);
  });
});

describe("Route Handler Contract: Auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Overview returns 401 when unauthenticated", async () => {
    const { getUnifiedAuth } = await import("@/lib/unified-auth");
    vi.mocked(getUnifiedAuth).mockResolvedValueOnce(null as never);

    const res = await getOverview(createRequest("/api/org/overview"));
    expect(res.status).toBe(401);
  });

  it("Ownership returns 401 when unauthenticated", async () => {
    const { getUnifiedAuth } = await import("@/lib/unified-auth");
    vi.mocked(getUnifiedAuth).mockResolvedValueOnce(null as never);

    const res = await getOwnership(createRequest("/api/org/ownership"));
    expect(res.status).toBe(401);
  });

  it("Overview returns 403 when forbidden", async () => {
    const { assertAccess } = await import("@/lib/auth/assertAccess");
    vi.mocked(assertAccess).mockRejectedValueOnce(new Error("Forbidden"));

    const res = await getOverview(createRequest("/api/org/overview"));
    expect(res.status).toBe(403);
  });

  it("Ownership returns 403 when forbidden", async () => {
    const { assertAccess } = await import("@/lib/auth/assertAccess");
    vi.mocked(assertAccess).mockRejectedValueOnce(new Error("Forbidden"));

    const res = await getOwnership(createRequest("/api/org/ownership"));
    expect(res.status).toBe(403);
  });
});

describe("Route Handler Contract: Versioning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("default version and v2 return identical counts", async () => {
    const defaultRes = await getOverview(createRequest("/api/org/overview"));
    const v2Res = await getOverview(createRequest("/api/org/overview", "v2"));

    const defaultData = await defaultRes.json();
    const v2Data = await v2Res.json();

    expect(defaultData.summary.unownedEntities).toBe(v2Data.summary.unownedEntities);
  });

  it("unowned count is always non-negative", async () => {
    const res = await getOverview(createRequest("/api/org/overview"));
    const data = await res.json();

    // Route uses Math.max(0, unownedEntities)
    expect(data.summary.unownedEntities).toBeGreaterThanOrEqual(0);
  });
});
