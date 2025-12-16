import { describe, it, expect } from "vitest";
import { mapDepartmentToContextObject, OrgDepartmentSource } from "@/lib/loopbrain/orgContextMapper";
import { departmentId } from "@/lib/loopbrain/orgIds";

describe("mapDepartmentToContextObject", () => {
  it("maps an active department into a ContextObject with expected fields", () => {
    const now = new Date("2025-01-01T12:00:00.000Z");

    const source: OrgDepartmentSource = {
      id: "dept-123",
      workspaceId: "ws-1",
      name: "Engineering",
      description: "Owns core product and platform development.",
      isActive: true,
      updatedAt: now,
      teamCount: 3,
    };

    const result = mapDepartmentToContextObject(source);

    expect(result.id).toBe(departmentId("dept-123"));
    expect(result.type).toBe("department");
    expect(result.title).toBe("Engineering");
    expect(result.status).toBe("ACTIVE");
    expect(result.owner).toBeNull();
    expect(result.updatedAt).toBe(now.toISOString());

    // Summary should be non-empty and mention the name
    expect(result.summary).toContain("Engineering");

    // Tags should include basic org metadata
    expect(result.tags).toEqual(
      expect.arrayContaining([
        "org:department",
        "workspace:ws-1",
        expect.stringMatching(/^department:/),
        "teams:3",
      ])
    );

    // For now, mapping does not add relations directly
    expect(Array.isArray(result.relations)).toBe(true);
  });

  it("handles missing description and teamCount gracefully", () => {
    const now = new Date("2025-01-02T12:00:00.000Z");

    const source: OrgDepartmentSource = {
      id: "dept-456",
      workspaceId: "ws-2",
      name: "Operations",
      description: null,
      isActive: false,
      updatedAt: now,
      // teamCount intentionally omitted
    };

    const result = mapDepartmentToContextObject(source);

    expect(result.status).toBe("INACTIVE");
    expect(result.summary.length).toBeGreaterThan(0);
    // No teams:<n> tag when teamCount is missing
    expect(result.tags.some((t) => t.startsWith("teams:"))).toBe(false);
  });
});











