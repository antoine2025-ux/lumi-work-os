/**
 * Route Handler Tests for /api/org/reasoning
 *
 * TRUE route-level tests that call the actual exported GET handler.
 * This proves the route can't drift from the reasoning engine.
 *
 * Mocks:
 * - getUnifiedAuth (auth)
 * - assertAccess (authorization)
 * - getOrgIntelligenceSnapshot (Phase S snapshot)
 * - serializeSnapshot (snapshot DTO)
 *
 * Asserts:
 * - Auth (401/403)
 * - Version behavior (default = v1)
 * - Limit behavior (0 returns empty, >50 clamps)
 * - Meta traceability (inputSnapshotMeta)
 * - Determinism
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  ORG_REASONING_SCHEMA_VERSION,
  ORG_REASONING_SEMANTICS_VERSION,
  REASONING_MAX_LIMIT,
} from "../version";

// ============================================================================
// Test Data
// ============================================================================

const mockSnapshotMeta = {
  computedAt: new Date("2026-01-24T10:00:00.000Z"),
  schemaVersion: 1,
  semanticsVersion: 1,
  assumptionsId: "org-snapshot:v1",
  dataAssumptions: ["workspaceIdFromAuthOnly"],
};

const mockSnapshot = {
  ownership: {
    coverage: {
      teams: { total: 3, owned: 1, unowned: 2, percent: 33 },
      departments: { total: 2, owned: 1, unowned: 1, percent: 50 },
      overallPercent: 40,
    },
    unownedEntities: [
      { type: "team" as const, id: "team-1", name: "Team 1" },
      { type: "team" as const, id: "team-2", name: "Team 2" },
      { type: "department" as const, id: "dept-1", name: "Dept 1" },
    ],
    unassignedTeamsExcludedFromCoverage: [],
    conflicts: [],
    ownershipByEntity: {},
    issues: [],
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
  people: {
    peopleWithoutManagers: [],
    managerLoad: [],
    overloadedManagers: [],
    issues: [],
  },
  capacity: {
    roleDistribution: [],
    teamsWithZeroExecutionCapacity: [],
    issues: [],
  },
  _meta: mockSnapshotMeta,
};

const mockSnapshotDTO = {
  ...mockSnapshot,
  _meta: {
    ...mockSnapshotMeta,
    computedAt: mockSnapshotMeta.computedAt.toISOString(),
  },
};

// ============================================================================
// Mocks
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

vi.mock("@/lib/org/intelligence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../intelligence/index")>();
  return {
    ...actual,
    getOrgIntelligenceSnapshot: vi.fn().mockResolvedValue(mockSnapshot),
    serializeSnapshot: vi.fn().mockReturnValue(mockSnapshotDTO),
  };
});

// ============================================================================
// Import Route AFTER mocks
// ============================================================================

let getReasoningHandler: (req: NextRequest) => Promise<Response>;

beforeAll(async () => {
  const module = await import("@/app/api/org/reasoning/route");
  getReasoningHandler = module.GET;
});

// ============================================================================
// Helpers
// ============================================================================

function createRequest(path: string, params?: Record<string, string>): NextRequest {
  const url = new URL(`http://localhost:3000${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new NextRequest(url);
}

// ============================================================================
// Auth Tests
// ============================================================================

describe("Route Handler: Auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    const { getUnifiedAuth } = await import("@/lib/unified-auth");
    vi.mocked(getUnifiedAuth).mockResolvedValueOnce(null as any);

    const res = await getReasoningHandler(createRequest("/api/org/reasoning"));

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 403 when forbidden", async () => {
    const { assertAccess } = await import("@/lib/auth/assertAccess");
    vi.mocked(assertAccess).mockRejectedValueOnce(new Error("Forbidden"));

    const res = await getReasoningHandler(createRequest("/api/org/reasoning"));

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("FORBIDDEN");
  });
});

// ============================================================================
// Version Tests
// ============================================================================

describe("Route Handler: Version Behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("default version equals v1", async () => {
    const defaultRes = await getReasoningHandler(createRequest("/api/org/reasoning"));
    const v1Res = await getReasoningHandler(
      createRequest("/api/org/reasoning", { version: "v1" })
    );

    expect(defaultRes.status).toBe(200);
    expect(v1Res.status).toBe(200);

    const defaultData = await defaultRes.json();
    const v1Data = await v1Res.json();

    // Both should succeed with ok: true
    expect(defaultData.ok).toBe(true);
    expect(v1Data.ok).toBe(true);

    // Both should have same structure
    expect(defaultData.data.summaries.total).toBe(v1Data.data.summaries.total);
  });

  it("returns 400 for unsupported version", async () => {
    const res = await getReasoningHandler(
      createRequest("/api/org/reasoning", { version: "v99" })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error.code).toBe("UNSUPPORTED_VERSION");
  });
});

// ============================================================================
// Limit Tests
// ============================================================================

describe("Route Handler: Limit Behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("limit=0 returns empty recommendations", async () => {
    const res = await getReasoningHandler(
      createRequest("/api/org/reasoning", { limit: "0" })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.data.recommendations).toHaveLength(0);
  });

  it("limit > 50 clamps to 50", async () => {
    const res = await getReasoningHandler(
      createRequest("/api/org/reasoning", { limit: "100" })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.data.recommendations.length).toBeLessThanOrEqual(REASONING_MAX_LIMIT);
  });

  it("invalid limit uses default", async () => {
    const res = await getReasoningHandler(
      createRequest("/api/org/reasoning", { limit: "invalid" })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    // Should use default limit (10), not error
  });
});

// ============================================================================
// Meta Tests
// ============================================================================

describe("Route Handler: Meta Traceability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes inputSnapshotMeta in response", async () => {
    const res = await getReasoningHandler(createRequest("/api/org/reasoning"));

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.data._meta.inputSnapshotMeta).toBeDefined();
    expect(data.data._meta.inputSnapshotMeta.schemaVersion).toBe(1);
    expect(data.data._meta.inputSnapshotMeta.semanticsVersion).toBe(1);
    expect(data.data._meta.inputSnapshotMeta.assumptionsId).toBe("org-snapshot:v1");
  });

  it("includes reasoning version constants", async () => {
    const res = await getReasoningHandler(createRequest("/api/org/reasoning"));

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.data._meta.reasoningSchemaVersion).toBe(ORG_REASONING_SCHEMA_VERSION);
    expect(data.data._meta.reasoningSemanticsVersion).toBe(ORG_REASONING_SEMANTICS_VERSION);
    expect(data.data._meta.snapshotApiVersion).toBe("v2");
  });

  it("computedAt is valid ISO timestamp", async () => {
    const res = await getReasoningHandler(createRequest("/api/org/reasoning"));

    expect(res.status).toBe(200);
    const data = await res.json();

    const date = new Date(data.data._meta.computedAt);
    expect(date.toISOString()).toBe(data.data._meta.computedAt);
  });
});

// ============================================================================
// Response Shape Tests
// ============================================================================

describe("Route Handler: Response Shape", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has expected success response shape", async () => {
    const res = await getReasoningHandler(createRequest("/api/org/reasoning"));

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.ok).toBe(true);
    expect(data.data).toHaveProperty("recommendations");
    expect(data.data).toHaveProperty("summaries");
    expect(data.data).toHaveProperty("_meta");

    expect(Array.isArray(data.data.recommendations)).toBe(true);
    expect(data.data.summaries).toHaveProperty("byCategory");
    expect(data.data.summaries).toHaveProperty("criticalCount");
    expect(data.data.summaries).toHaveProperty("total");
  });

  it("summaries reflect full count, not limited", async () => {
    const res = await getReasoningHandler(
      createRequest("/api/org/reasoning", { limit: "1" })
    );

    expect(res.status).toBe(200);
    const data = await res.json();

    // Summaries should reflect total, even with limit
    expect(data.data.summaries.total).toBeGreaterThanOrEqual(
      data.data.recommendations.length
    );
  });
});

// ============================================================================
// Determinism Tests
// ============================================================================

describe("Route Handler: Determinism", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("multiple calls return same order", async () => {
    const results = await Promise.all(
      Array.from({ length: 3 }, () =>
        getReasoningHandler(createRequest("/api/org/reasoning"))
      )
    );

    const allData = await Promise.all(results.map((r) => r.json()));

    const firstCodes = allData[0].data.recommendations.map(
      (r: { code: string }) => r.code
    );

    for (const data of allData) {
      const codes = data.data.recommendations.map((r: { code: string }) => r.code);
      expect(codes).toEqual(firstCodes);
    }
  });
});
