/**
 * Targeted Org Sub-Context Fetchers
 * 
 * Provides specialized context fetchers for specific org question types:
 * - Headcount: people, teams, departments (for composition questions)
 * - Reporting: people with reporting relations (for org chart questions)
 * - Risk: people, teams with health signals (for risk analysis questions)
 */

import { ContextObject } from "@/lib/context/contextTypes";
import { getOrgContextForLoopbrain } from "./orgContextForLoopbrain";

export type OrgHeadcountContext = {
  org: ContextObject | null;
  people: ContextObject[];
  teams: ContextObject[];
  departments: ContextObject[];
};

export type OrgReportingContext = {
  org: ContextObject | null;
  people: ContextObject[]; // persons + their manager/report relations
};

export type OrgRiskContext = {
  org: ContextObject | null;
  people: ContextObject[];
  teams: ContextObject[];
};

/**
 * Get org context focused on headcount and composition.
 * 
 * Returns org, people, teams, and departments for answering
 * questions about headcount, team size, department composition, etc.
 */
export async function getOrgHeadcountContextForLoopbrain(
  workspaceId: string
): Promise<OrgHeadcountContext> {
  const { org, related } = await getOrgContextForLoopbrain(workspaceId);

  const people = related.filter((ctx) => ctx.type === "person");
  const teams = related.filter((ctx) => ctx.type === "team");
  const departments = related.filter((ctx) => ctx.type === "department");

  return {
    org,
    people,
    teams,
    departments,
  };
}

/**
 * Get org context focused on reporting lines and org structure.
 * 
 * Returns org and people (with their reporting relations) for answering
 * questions about managers, direct reports, org chart, reporting lines, etc.
 */
export async function getOrgReportingContextForLoopbrain(
  workspaceId: string
): Promise<OrgReportingContext> {
  const { org, related } = await getOrgContextForLoopbrain(workspaceId);

  const people = related.filter((ctx) => ctx.type === "person");

  // NOTE: reporting relations (reports_to, manages) are already inside person.relations.
  // We don't need to filter them here; the LLM will see them via each ContextObject.

  return {
    org,
    people,
  };
}

/**
 * Get org context focused on organizational risks.
 * 
 * Returns org (with health signals), people, and teams for answering
 * questions about single-point teams, overloaded managers, org health, etc.
 */
export async function getOrgRiskContextForLoopbrain(
  workspaceId: string
): Promise<OrgRiskContext> {
  const { org, related } = await getOrgContextForLoopbrain(workspaceId);

  const people = related.filter((ctx) => ctx.type === "person");
  const teams = related.filter((ctx) => ctx.type === "team");

  // Org-level risk info (health, single-point teams, overload) is embedded in org.tags / org.summary.

  return {
    org,
    people,
    teams,
  };
}

