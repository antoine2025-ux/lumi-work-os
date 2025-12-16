import { NextRequest } from "next/server";
import {
  fetchOrgContextSliceForWorkspace,
  fetchOrgContextSliceForCurrentWorkspace,
  OrgContextSlice,
  OrgContextObject,
} from "./org-context-reader";

/**
 * Build a compact, LLM-friendly summary of the org structure.
 * This is meant to be used as a preamble in Loopbrain prompts.
 */
export function buildOrgSummaryPreambleFromSlice(
  slice: OrgContextSlice,
  options?: {
    maxPerType?: number;
  }
): string {
  const maxPerType = options?.maxPerType ?? 10;

  const lines: string[] = [];

  const root = slice.root;
  const counts = {
    total: slice.all.length,
    people: slice.people.length,
    teams: slice.teams.length,
    departments: slice.departments.length,
    positions: slice.positions.length,
  };

  lines.push("ORG CONTEXT SUMMARY");
  lines.push("-------------------");
  if (root) {
    lines.push(`Root: ${root.id} — ${root.title}`);
    if (root.summary) {
      lines.push(`Root summary: ${root.summary}`);
    }
  } else {
    lines.push("Root: (none found)");
  }

  lines.push(
    `Counts: total=${counts.total}, people=${counts.people}, teams=${counts.teams}, departments=${counts.departments}, positions=${counts.positions}`
  );
  lines.push("");

  function addSection(title: string, objects: OrgContextObject[]) {
    lines.push(title);
    lines.push("----------");

    if (objects.length === 0) {
      lines.push("  (none)");
      lines.push("");
      return;
    }

    const sample = objects.slice(0, maxPerType);
    for (const obj of sample) {
      const status =
        obj.status && obj.status !== "ACTIVE" ? ` [${obj.status}]` : "";
      lines.push(`- ${obj.type} :: ${obj.id}${status}`);
      lines.push(`  Title: ${obj.title}`);
      if (obj.summary) {
        lines.push(`  Summary: ${obj.summary}`);
      }

      const tagSample = obj.tags.slice(0, 6);
      if (tagSample.length > 0) {
        lines.push(`  Tags: ${tagSample.join(", ")}`);
      }

      const relSample = obj.relations.slice(0, 3);
      if (relSample.length > 0) {
        const relStrings = relSample.map(
          (rel) => `${rel.type} -> ${rel.targetId}`
        );
        lines.push(`  Relations: ${relStrings.join("; ")}`);
      }

      lines.push(""); // blank line between items
    }

    if (objects.length > maxPerType) {
      lines.push(
        `  (+${objects.length - maxPerType} more ${title.toLowerCase()} not listed)`
      );
    }

    lines.push(""); // blank line after section
  }

  addSection("DEPARTMENTS", slice.departments);
  addSection("TEAMS", slice.teams);
  addSection("POSITIONS", slice.positions);
  addSection("PEOPLE", slice.people);

  lines.push("END ORG CONTEXT SUMMARY");

  return lines.join("\n");
}

/**
 * Convenience: build Org summary preamble for the current workspace.
 */
export async function buildOrgSummaryPreambleForCurrentWorkspace(
  options?: {
    maxPerType?: number;
  },
  request?: NextRequest
): Promise<string> {
  const slice = await fetchOrgContextSliceForCurrentWorkspace(request);
  return buildOrgSummaryPreambleFromSlice(slice, options);
}

/**
 * Convenience: build Org summary preamble for a specific workspace.
 */
export async function buildOrgSummaryPreambleForWorkspace(
  workspaceId: string,
  options?: {
    maxPerType?: number;
  }
): Promise<string> {
  const slice = await fetchOrgContextSliceForWorkspace(workspaceId);
  return buildOrgSummaryPreambleFromSlice(slice, options);
}

