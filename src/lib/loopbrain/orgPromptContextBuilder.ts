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
  
  // Filter roles to exclude generic RoleCard templates (they have "role-card:" in contextId)
  // and only include actual OrgPosition-based roles
  const roles = related.filter((ctx) => 
    ctx.type === "role" && !ctx.id.includes("role-card:")
  );

  return {
    org,
    people,
    teams,
    departments,
    roles,
  };
}

// ────────────────────────────────────────────────────────────────
//  Tag helpers: extract structured values from tag arrays
// ────────────────────────────────────────────────────────────────

function tagValue(tags: string[], prefix: string): string | null {
  const tag = tags.find((t) => t.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

/**
 * Build a compact, structured org context text for LLM prompts.
 * 
 * Presents org data in a clear, human-readable format optimised for
 * LLM comprehension. Data is extracted from ContextObject tags and
 * presented with labelled fields instead of raw tag dumps.
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

  // ── Org root ──────────────────────────────────────────────────
  lines.push("## ORGANIZATIONAL CONTEXT");
  lines.push("");

  if (context.org) {
    const orgName = context.org.title.replace(/ – Org Context$/, "");
    lines.push(`Organization: **${orgName}**`);
    lines.push(`Total people: ${context.people.length}`);
    lines.push(`Total teams: ${context.teams.length}`);
    lines.push(`Total departments: ${context.departments.length}`);
    lines.push(`Total roles: ${context.roles.length}`);
  } else {
    lines.push("Organization: (no org root found)");
  }

  lines.push("");

  // ── People ────────────────────────────────────────────────────
  if (context.people.length > 0) {
    lines.push(`## PEOPLE (${context.people.length})`);
    lines.push("");
    const peopleSlice = context.people.slice(0, maxPeople);
    for (const person of peopleSlice) {
      const tags = person.tags;
      const name = person.title.replace(/ – Person Context$/, "");
      const role = tagValue(tags, "role:") ?? "Unknown role";
      const reportsTo = tagValue(tags, "reports_to:");
      const directReports = tagValue(tags, "direct_reports:");
      const teamId = tagValue(tags, "team_id:");
      const projects = tagValue(tags, "projects:") ?? "0";
      const activeTasks = tagValue(tags, "tasks_active:") ?? "0";
      const blockedTasks = tagValue(tags, "tasks_blocked:") ?? "0";

      lines.push(`- **${name}** — ${role}`);
      if (reportsTo) lines.push(`  Reports to: ${reportsTo}`);
      if (directReports && directReports !== "0") lines.push(`  Direct reports: ${directReports}`);
      if (teamId) lines.push(`  Team ID: ${teamId}`);
      lines.push(`  Workload: ${projects} project(s), ${activeTasks} active task(s), ${blockedTasks} blocked`);
    }
    if (context.people.length > maxPeople) {
      lines.push(`... (+${context.people.length - maxPeople} more people)`);
    }
    lines.push("");
  }

  // ── Reporting structure ───────────────────────────────────────
  // Build an explicit reporting tree for easy LLM consumption
  if (context.people.length > 0) {
    lines.push("## REPORTING STRUCTURE");
    lines.push("");

    // Find people who have no manager (top-level)
    const topLevel = context.people.filter(
      (p) => !p.tags.some((t) => t.startsWith("reports_to:"))
    );
    const reporters = context.people.filter(
      (p) => p.tags.some((t) => t.startsWith("reports_to:"))
    );

    for (const person of topLevel) {
      const name = person.title.replace(/ – Person Context$/, "");
      const role = tagValue(person.tags, "role:") ?? "Unknown role";
      lines.push(`- ${name} (${role}) — TOP LEVEL`);

      // Find people who report to this person
      for (const report of reporters) {
        const reportName = report.title.replace(/ – Person Context$/, "");
        const reportRole = tagValue(report.tags, "role:") ?? "Unknown role";
        const reportsTo = tagValue(report.tags, "reports_to:") ?? "";
        if (reportsTo === name) {
          lines.push(`  └─ ${reportName} (${reportRole}) reports to ${name}`);
        }
      }
    }
    lines.push("");
  }

  // ── Teams ─────────────────────────────────────────────────────
  if (context.teams.length > 0) {
    lines.push(`## TEAMS (${context.teams.length})`);
    lines.push("");
    const teamsSlice = context.teams.slice(0, maxTeams);
    for (const team of teamsSlice) {
      const tags = team.tags;
      const name = team.title.replace(/ – Team Context$/, "");
      const positions = tagValue(tags, "positions:") ?? "?";
      const filledPositions = tagValue(tags, "filled_positions:") ?? "?";
      const people = tagValue(tags, "people:") ?? "?";

      lines.push(`- **${name}**: ${people} member(s), ${filledPositions}/${positions} positions filled`);
    }
    if (context.teams.length > maxTeams) {
      lines.push(`... (+${context.teams.length - maxTeams} more teams)`);
    }
    lines.push("");
  }

  // ── Departments ───────────────────────────────────────────────
  if (context.departments.length > 0) {
    lines.push(`## DEPARTMENTS (${context.departments.length})`);
    lines.push("");
    const departmentsSlice = context.departments.slice(0, maxDepartments);
    for (const dept of departmentsSlice) {
      const tags = dept.tags;
      const name = dept.title.replace(/ – Department Context$/, "");
      const teams = tagValue(tags, "teams:") ?? "?";
      const people = tagValue(tags, "people:") ?? "?";

      lines.push(`- **${name}**: ${teams} team(s), ${people} person(s)`);
    }
    if (context.departments.length > maxDepartments) {
      lines.push(`... (+${context.departments.length - maxDepartments} more departments)`);
    }
    lines.push("");
  }

  // ── Roles ─────────────────────────────────────────────────────
  if (context.roles.length > 0) {
    lines.push(`## ROLES (${context.roles.length})`);
    lines.push("");
    const rolesSlice = context.roles.slice(0, maxRoles);
    for (const role of rolesSlice) {
      const tags = role.tags;
      const roleTitle = tagValue(tags, "role_title:") ?? role.title.replace(/ – Role Context$/, "");
      const holder = role.owner ?? "VACANT";
      const vacant = tagValue(tags, "vacant:") === "true";

      lines.push(`- **${roleTitle}** — Held by: ${vacant ? "VACANT (no one assigned)" : holder}`);
    }
    if (context.roles.length > maxRoles) {
      lines.push(`... (+${context.roles.length - maxRoles} more roles)`);
    }
    lines.push("");
  }

  // ── Instructions ──────────────────────────────────────────────
  lines.push("---");
  lines.push("INSTRUCTIONS: Use the data above to answer org questions. The REPORTING STRUCTURE section shows who reports to whom. The PEOPLE section lists every person with their role, manager, and workload. The ROLES section shows which positions exist and who holds them. Always ground your answer in this data. Do not invent people, teams, or roles not listed above.");

  return lines.join("\n");
}

