import { NextRequest } from "next/server";
import {
  fetchOrgContextSliceForWorkspace,
  fetchOrgContextSliceForCurrentWorkspace,
  OrgContextSlice,
  OrgContextObject,
} from "./org-context-reader";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";

/**
 * Build a compact, LLM-friendly summary of the org structure.
 * This is meant to be used as a preamble in Loopbrain prompts.
 */
export function buildOrgSummaryPreambleFromSlice(
  slice: OrgContextSlice,
  options?: {
    maxPerType?: number;
    wikiDataByPersonId?: Record<string, { count: number; titles: string[] }>;
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

      if (obj.type === "person" && options?.wikiDataByPersonId) {
        const wikiData = options.wikiDataByPersonId[obj.id];
        if (wikiData && wikiData.count > 0) {
          lines.push(
            `  Wiki contributions: ${wikiData.count} page${wikiData.count === 1 ? "" : "s"} — ${wikiData.titles.join("; ")}`
          );
        }
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
 * Includes per-person wiki contribution counts and recent page titles.
 */
export async function buildOrgSummaryPreambleForCurrentWorkspace(
  options?: {
    maxPerType?: number;
  },
  request?: NextRequest
): Promise<string> {
  const { workspaceId } = await getUnifiedAuth(request);
  const slice = await fetchOrgContextSliceForCurrentWorkspace(request);

  let wikiDataByPersonId: Record<string, { count: number; titles: string[] }> | undefined;

  if (workspaceId) {
    try {
      const wikiRows = await prisma.wikiPage.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: "desc" },
        select: { createdById: true, title: true },
      });
      wikiDataByPersonId = {};
      for (const row of wikiRows) {
        const entry = (wikiDataByPersonId[row.createdById] ??= { count: 0, titles: [] });
        entry.count++;
        if (entry.titles.length < 3) entry.titles.push(row.title);
      }
    } catch (err) {
      console.error("Failed to fetch wiki data for org preamble", err);
    }
  }

  return buildOrgSummaryPreambleFromSlice(slice, { ...options, wikiDataByPersonId });
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

