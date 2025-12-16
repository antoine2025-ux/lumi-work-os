import { describe, it, expect } from "vitest";
import {
  mapPositionToContextObject,
  OrgPositionSource,
} from "@/lib/loopbrain/orgContextMapper";
import { roleId, personId } from "@/lib/loopbrain/orgIds";

describe("mapPositionToContextObject", () => {
  it("maps a filled active position with team and department", () => {
    const now = new Date("2025-01-04T09:00:00.000Z");

    const source: OrgPositionSource = {
      id: "pos-1",
      workspaceId: "ws-1",
      title: "Senior Platform Engineer",
      level: 3,
      isActive: true,
      teamId: "team-1",
      teamName: "Platform",
      departmentId: "dept-1",
      departmentName: "Engineering",
      userId: "user-1",
      userName: "Aleksei Skvortsov",
      updatedAt: now,
      roleDescription: "Leads core platform initiatives and reliability.",
      responsibilities: ["Own platform reliability", "Mentor junior engineers"],
      requiredSkills: ["Go", "Kubernetes"],
      preferredSkills: ["PostgreSQL", "Terraform"],
    };

    const result = mapPositionToContextObject(source);

    expect(result.id).toBe(roleId("pos-1"));
    expect(result.type).toBe("role");
    expect(result.title).toBe("Senior Platform Engineer");
    expect(result.status).toBe("ACTIVE");
    expect(result.owner).toBe(personId("user-1"));
    expect(result.updatedAt).toBe(now.toISOString());

    // Summary should mention role, level, team, department
    expect(result.summary).toContain("Senior Platform Engineer");
    expect(result.summary).toContain("L3");
    expect(result.summary).toContain("Platform");
    expect(result.summary).toContain("Engineering");

    // Tags should encode role, level, team, department, and filled status
    expect(result.tags).toEqual(
      expect.arrayContaining([
        "org:role",
        "workspace:ws-1",
        expect.stringMatching(/^role:/),
        "level:L3",
        "teamId:team-1",
        expect.stringMatching(/^team:/),
        "departmentId:dept-1",
        expect.stringMatching(/^department:/),
        "status:filled",
      ])
    );
  });

  it("maps a vacant inactive position without team/department gracefully", () => {
    const now = new Date("2025-01-04T10:00:00.000Z");

    const source: OrgPositionSource = {
      id: "pos-2",
      workspaceId: "ws-2",
      title: "Head of Operations",
      level: null,
      isActive: false,
      teamId: null,
      teamName: null,
      departmentId: null,
      departmentName: null,
      userId: null,
      userName: null,
      updatedAt: now,
      roleDescription: null,
      responsibilities: [],
      requiredSkills: [],
      preferredSkills: [],
    };

    const result = mapPositionToContextObject(source);

    expect(result.id).toBe(roleId("pos-2"));
    expect(result.type).toBe("role");
    expect(result.status).toBe("INACTIVE");
    expect(result.owner).toBeNull();

    // Should not blow up when department/team are missing
    expect(result.summary).toContain("Head of Operations");

    // Should mark as vacant
    expect(result.tags).toEqual(
      expect.arrayContaining([
        "org:role",
        "workspace:ws-2",
        "status:vacant",
      ])
    );

    // Should NOT have team/department tags when none present
    expect(result.tags.some((t) => t.startsWith("teamId:"))).toBe(false);
    expect(result.tags.some((t) => t.startsWith("team:"))).toBe(false);
    expect(result.tags.some((t) => t.startsWith("departmentId:"))).toBe(false);
    expect(result.tags.some((t) => t.startsWith("department:"))).toBe(false);
  });
});

