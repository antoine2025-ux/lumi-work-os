/**
 * Org Referenced Context Tracker
 * 
 * Tracks which ContextObjects and tags were used in org responses
 * and formats them as a footer for transparency and debugging.
 */

import type { ContextObject } from "@/lib/context/contextTypes";
import type {
  OrgHeadcountContext,
  OrgReportingContext,
  OrgRiskContext,
} from "../orgSubContexts";
import type { OrgPromptContext } from "../orgPromptContextBuilder";

type OrgPromptContextForTracking =
  | { type: "org.headcount"; context: OrgHeadcountContext }
  | { type: "org.reporting"; context: OrgReportingContext }
  | { type: "org.risk"; context: OrgRiskContext }
  | { type: "org.generic"; context: OrgPromptContext };

type ReferencedContextEntry =
  | { kind: "org"; id: string; title: string }
  | { kind: "person"; id: string; title: string }
  | { kind: "team"; id: string; title: string }
  | { kind: "department"; id: string; title: string }
  | { kind: "role"; id: string; title: string }
  | { kind: "tag"; value: string };

export type ReferencedContextSummary = {
  entries: ReferencedContextEntry[];
};

/**
 * Build referenced context summary from org prompt context.
 * 
 * Extracts the most relevant ContextObjects and tags that were
 * available to the model for generating the response.
 */
export function buildReferencedContextSummary(
  ctx: OrgPromptContextForTracking
): ReferencedContextSummary {
  const entries: ReferencedContextEntry[] = [];

  const orgContext = ctx.context;

  if (orgContext.org) {
    entries.push({
      kind: "org",
      id: orgContext.org.id,
      title: orgContext.org.title,
    });

    // Take a few "org_" style tags that are especially relevant
    const orgTags = (orgContext.org.tags || []).filter(
      (tag) => tag.startsWith("org_") || tag.startsWith("org_health")
    );
    for (const tag of orgTags.slice(0, 10)) {
      entries.push({
        kind: "tag",
        value: tag,
      });
    }
  }

  const addPeople = (people: ContextObject[], limit: number) => {
    for (const p of people.slice(0, limit)) {
      entries.push({
        kind: "person",
        id: p.id,
        title: p.title,
      });
    }
  };

  const addTeams = (teams: ContextObject[], limit: number) => {
    for (const t of teams.slice(0, limit)) {
      entries.push({
        kind: "team",
        id: t.id,
        title: t.title,
      });
    }
  };

  const addDepartments = (departments: ContextObject[], limit: number) => {
    for (const d of departments.slice(0, limit)) {
      entries.push({
        kind: "department",
        id: d.id,
        title: d.title,
      });
    }
  };

  const addRoles = (roles: ContextObject[], limit: number) => {
    for (const r of roles.slice(0, limit)) {
      entries.push({
        kind: "role",
        id: r.id,
        title: r.title,
      });
    }
  };

  switch (ctx.type) {
    case "org.headcount":
      addPeople(orgContext.people, 10);
      addTeams((orgContext as any).teams, 10);
      addDepartments((orgContext as any).departments, 10);
      break;

    case "org.reporting":
      addPeople(orgContext.people, 20);
      break;

    case "org.risk":
      addPeople(orgContext.people, 10);
      addTeams((orgContext as any).teams, 10);
      break;

    case "org.generic":
      addPeople(orgContext.people, 10);
      addTeams((orgContext as any).teams, 10);
      addDepartments((orgContext as any).departments, 10);
      addRoles((orgContext as any).roles, 10);
      break;
  }

  return { entries };
}

/**
 * Format referenced context summary as a footer string.
 * 
 * Returns a human-readable footer that can be appended to responses.
 */
export function formatReferencedContextFooter(
  summary: ReferencedContextSummary
): string {
  if (!summary.entries.length) {
    return "";
  }

  const lines: string[] = ["", "---", "Referenced context:"];

  for (const entry of summary.entries) {
    if (entry.kind === "tag") {
      lines.push(`- tag:${entry.value}`);
    } else {
      lines.push(`- ${entry.kind}:${entry.id} (“${entry.title}”)`);
    }
  }

  return lines.join("\n");
}

