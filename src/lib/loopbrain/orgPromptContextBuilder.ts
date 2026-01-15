/**
 * Org Prompt Context Builder
 * 
 * Builds structured org context for Loopbrain prompts from ContextStore.
 * This provides a clean, normalized view of org data for LLM consumption.
 */

import { getOrgContextForLoopbrain } from "./orgContextForLoopbrain";
import { ContextObject } from "@/lib/context/contextTypes";

export type OrgPromptContext = {
  org: ContextObject | null;
  people: ContextObject[];
  teams: ContextObject[];
  departments: ContextObject[];
  roles: ContextObject[];
};

/**
 * Build org prompt context from ContextStore.
 * 
 * Reads all org-related ContextItems and partitions them by type
 * for easy prompt composition.
 */
export async function buildOrgPromptContext(
  workspaceId: string
): Promise<OrgPromptContext> {
  const { org, related } = await getOrgContextForLoopbrain(workspaceId);

  const people = related.filter((ctx) => ctx.type === "person");
  const teams = related.filter((ctx) => ctx.type === "team");
  const departments = related.filter((ctx) => ctx.type === "department");
  const roles = related.filter((ctx) => ctx.type === "role");

  return {
    org,
    people,
    teams,
    departments,
    roles,
  };
}

/**
 * Build a compact, structured org context text for LLM prompts.
 * 
 * This creates a human-readable summary of org structure that can be
 * injected into prompts for org-related queries.
 */
export function buildOrgContextText(
  context: OrgPromptContext,
  options?: {
    maxPeople?: number;
    maxTeams?: number;
    maxDepartments?: number;
    maxRoles?: number;
  }
): string {
  const {
    maxPeople = 20,
    maxTeams = 15,
    maxDepartments = 10,
    maxRoles = 10,
  } = options || {};

  const lines: string[] = [];

  lines.push("### ORGANIZATIONAL CONTEXT");

  // Org root summary
  if (context.org) {
    const orgSummary = context.org.summary || "Organization structure";
    const healthTags = context.org.tags.filter((t) =>
      t.startsWith("org_health")
    );
    const healthInfo =
      healthTags.length > 0
        ? ` | Health: ${healthTags.join(", ")}`
        : "";

    lines.push(
      `Org: ${context.org.title} | ${orgSummary}${healthInfo}`
    );
  } else {
    lines.push("Org: (no org root found)");
  }

  lines.push("");

  // People section
  if (context.people.length > 0) {
    lines.push(`### PEOPLE (${context.people.length} total, showing ${Math.min(context.people.length, maxPeople)})`);
    const peopleSlice = context.people.slice(0, maxPeople);
    for (const person of peopleSlice) {
      const summary = person.summary
        ? person.summary.substring(0, 100)
        : "No summary";
      lines.push(`- ${person.title} | ${summary}`);
    }
    if (context.people.length > maxPeople) {
      lines.push(`... (+${context.people.length - maxPeople} more people)`);
    }
    lines.push("");
  }

  // Teams section
  if (context.teams.length > 0) {
    lines.push(`### TEAMS (${context.teams.length} total, showing ${Math.min(context.teams.length, maxTeams)})`);
    const teamsSlice = context.teams.slice(0, maxTeams);
    for (const team of teamsSlice) {
      const summary = team.summary
        ? team.summary.substring(0, 100)
        : "No summary";
      lines.push(`- ${team.title} | ${summary}`);
    }
    if (context.teams.length > maxTeams) {
      lines.push(`... (+${context.teams.length - maxTeams} more teams)`);
    }
    lines.push("");
  }

  // Departments section
  if (context.departments.length > 0) {
    lines.push(
      `### DEPARTMENTS (${context.departments.length} total, showing ${Math.min(context.departments.length, maxDepartments)})`
    );
    const departmentsSlice = context.departments.slice(0, maxDepartments);
    for (const dept of departmentsSlice) {
      const summary = dept.summary
        ? dept.summary.substring(0, 100)
        : "No summary";
      lines.push(`- ${dept.title} | ${summary}`);
    }
    if (context.departments.length > maxDepartments) {
      lines.push(
        `... (+${context.departments.length - maxDepartments} more departments)`
      );
    }
    lines.push("");
  }

  // Roles section
  if (context.roles.length > 0) {
    lines.push(`### ROLES (${context.roles.length} total, showing ${Math.min(context.roles.length, maxRoles)})`);
    const rolesSlice = context.roles.slice(0, maxRoles);
    for (const role of rolesSlice) {
      const summary = role.summary
        ? role.summary.substring(0, 100)
        : "No summary";
      const ownerTag = role.owner
        ? ` | Owner: ${role.owner}`
        : " | No owner";
      lines.push(`- ${role.title}${ownerTag} | ${summary}`);
    }
    if (context.roles.length > maxRoles) {
      lines.push(`... (+${context.roles.length - maxRoles} more roles)`);
    }
    lines.push("");
  }

  // Instructions
  lines.push(
    "Use this organizational context to answer questions about:"
  );
  lines.push(
    "- Headcount and team composition (use PEOPLE and TEAMS sections)"
  );
  lines.push(
    "- Reporting lines and managers (use PEOPLE relations: reports_to)"
  );
  lines.push(
    "- Team structure and departments (use TEAMS and DEPARTMENTS sections)"
  );
  lines.push(
    "- Role ownership and responsibilities (use ROLES section)"
  );
  lines.push(
    "- Org health status (use Org health tags and summary)"
  );
  lines.push(
    "Always ground your answers in the data above. Do not invent teams, people, or roles that are not listed."
  );

  return lines.join("\n");
}

