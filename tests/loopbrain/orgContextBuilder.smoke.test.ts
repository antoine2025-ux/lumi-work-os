import { describe, it, expect } from "vitest";
import { buildOrgContextBundleForCurrentWorkspace } from "@/lib/loopbrain/orgContextBuilder";

// NOTE: This assumes test setup configures a current workspace context,
// or getCurrentWorkspaceId() has a sensible default in tests.
describe("buildOrgContextBundleForCurrentWorkspace (smoke)", () => {
  it.skip("returns a bundle of arrays without throwing", async () => {
    const bundle = await buildOrgContextBundleForCurrentWorkspace();

    expect(Array.isArray(bundle.departments)).toBe(true);
    expect(Array.isArray(bundle.teams)).toBe(true);
    expect(Array.isArray(bundle.positions)).toBe(true);
    expect(Array.isArray(bundle.people)).toBe(true);
  });
});

