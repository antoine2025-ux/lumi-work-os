import { describe, it, expect } from "vitest";
import {
  mapTeamToContextObject,
  OrgTeamSource,
} from "@/lib/loopbrain/orgContextMapper";
import { teamId } from "@/lib/loopbrain/orgIds";

describe("mapTeamToContextObject", () => {
  it("maps an active team with department and memberCount", () => {
    const now = new Date("2025-01-03T10:00:00.000Z");

    const source: OrgTeamSource = {
      id: "team-123",
      workspaceId: "ws-1",
      name: "Platform",
      description: "Owns core infrastructure and developer experience.",
      isActive: true,
      departmentId: "dept-1",
      departmentName: "Engineering",
      updatedAt: now,
      memberCount: 5,
    };

    const result = mapTeamToContextObject(source);

    expect(result.id).toBe(teamId("team-123"));
    expect(result.type).toBe("team");
    expect(result.title).toBe("Platform");
    expect(result.status).toBe("ACTIVE");
    expect(result.owner).toBeNull();
    expect(result.updatedAt).toBe(now.toISOString());

    // Summary should mention team name and department
    expect(result.summary).toContain("Platform");
    expect(result.summary).toContain("Engineering");
    expect(result.summary).toContain("member");

    // Tags
    expect(result.tags).toEqual(
      expect.arrayContaining([
        "org:team",
        "workspace:ws-1",
        expect.stringMatching(/^team:/),
        "departmentId:dept-1",
        expect.stringMatching(/^department:/),
        "members:5",
      ])
    );

    // Relations remain empty in this mapper
    expect(Array.isArray(result.relations)).toBe(true);
  });

  it("handles missing department and memberCount gracefully", () => {
    const now = new Date("2025-01-03T11:00:00.000Z");

    const source: OrgTeamSource = {
      id: "team-456",
      workspaceId: "ws-2",
      name: "Special Projects",
      description: null,
      isActive: false,
      departmentId: null,
      departmentName: null,
      updatedAt: now,
      // memberCount intentionally omitted
    };

    const result = mapTeamToContextObject(source);

    expect(result.id).toBe(teamId("team-456"));
    expect(result.status).toBe("INACTIVE");
    expect(result.summary).toContain("Special Projects");
    // Should NOT have department/members tags
    expect(result.tags.some((t) => t.startsWith("departmentId:"))).toBe(false);
    expect(result.tags.some((t) => t.startsWith("members:"))).toBe(false);
  });
});

