import { describe, it, expect } from "vitest";
import {
  mapPersonToContextObject,
  OrgPersonSource,
  OrgPositionSource,
} from "@/lib/loopbrain/orgContextMapper";
import { personId } from "@/lib/loopbrain/orgIds";

describe("mapPersonToContextObject", () => {
  it("maps a person with a primary position (role + team + department)", () => {
    const now = new Date("2025-01-05T08:00:00.000Z");

    const primaryPosition: OrgPositionSource = {
      id: "pos-123",
      workspaceId: "ws-1",
      title: "Platform Engineer",
      level: 2,
      isActive: true,
      teamId: "team-1",
      teamName: "Platform",
      departmentId: "dept-1",
      departmentName: "Engineering",
      userId: "user-1",
      userName: "Jonas Lehtinen",
      updatedAt: now,
      roleDescription: "Works on core platform services.",
      responsibilities: ["Build platform features"],
      requiredSkills: ["TypeScript"],
      preferredSkills: ["Go"],
    };

    const source: OrgPersonSource = {
      id: "user-1",
      name: "Jonas Lehtinen",
      email: "jonas@example.com",
      updatedAt: now,
      primaryPosition,
    };

    const result = mapPersonToContextObject(source);

    expect(result.id).toBe(personId("user-1"));
    expect(result.type).toBe("person");
    expect(result.title).toBe("Jonas Lehtinen");
    expect(result.owner).toBe(personId("user-1"));
    expect(result.status).toBe("ACTIVE");
    expect(result.updatedAt).toBe(now.toISOString());

    // Summary should mention role, team, department
    expect(result.summary).toContain("Jonas Lehtinen");
    expect(result.summary).toContain("Platform Engineer");
    expect(result.summary).toContain("Platform");
    expect(result.summary).toContain("Engineering");

    // Tags should include person, email, role, team, department
    expect(result.tags).toEqual(
      expect.arrayContaining([
        "org:person",
        expect.stringMatching(/^person:/),
        "email:jonas@example.com",
        expect.stringMatching(/^role:/),
        "level:L2",
        "teamId:team-1",
        expect.stringMatching(/^team:/),
        "departmentId:dept-1",
        expect.stringMatching(/^department:/),
      ])
    );

    // role:unassigned should NOT be present
    expect(result.tags.includes("role:unassigned")).toBe(false);
  });

  it("maps a person without a primary position (unassigned role)", () => {
    const now = new Date("2025-01-05T09:00:00.000Z");

    const source: OrgPersonSource = {
      id: "user-2",
      name: null,
      email: "no-position@example.com",
      updatedAt: now,
      primaryPosition: null,
    };

    const result = mapPersonToContextObject(source);

    expect(result.id).toBe(personId("user-2"));
    expect(result.type).toBe("person");
    expect(result.title).toBe("no-position@example.com");
    expect(result.owner).toBe(personId("user-2"));

    expect(result.summary).toContain("no-position@example.com");
    expect(result.summary).toContain("No primary Org position");

    // Tags: person, email, and role:unassigned
    expect(result.tags).toEqual(
      expect.arrayContaining([
        "org:person",
        expect.stringMatching(/^person:/),
        "email:no-position@example.com",
        "role:unassigned",
      ])
    );
  });
});

