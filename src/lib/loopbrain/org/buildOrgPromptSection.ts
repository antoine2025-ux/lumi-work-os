// src/lib/loopbrain/org/buildOrgPromptSection.ts

import type {
  OrgLoopbrainContextBundle,
  OrgLoopbrainContextObject,
} from "./types";

/**
 * Build a compact, LLM-friendly Org context section from the OrgLoopbrainContextBundle.
 * This should be *summarised* and structured, not a raw JSON dump.
 *
 * Format:
 *
 * <ORG_GRAPH>
 * Org:
 *   id: org
 *   title: ...
 *   summary: ...
 *
 * Departments:
 *   - [department:abc] Name — summary
 *
 * Teams:
 *   - [team:xyz] Name — summary
 *
 * People:
 *   - [person:123] Full Name — summary
 *
 * Relations (key edges only):
 *   - person:alice reports_to person:bob
 *   - person:alice member_of_team team:platform
 *   - team:platform member_of_department department:engineering
 * </ORG_GRAPH>
 */
export function buildOrgPromptSectionFromBundle(
  bundle: OrgLoopbrainContextBundle
): string {
  const lines: string[] = [];

  lines.push("<ORG_GRAPH>");
  lines.push(
    "You have access to a structured Org graph (departments, teams, roles, people, reporting lines)."
  );
  lines.push(
    "Use this data to answer Org-related questions accurately and concretely."
  );
  lines.push("");

  // Org root
  if (bundle.primary) {
    lines.push("Org:");
    lines.push(
      `  id: ${bundle.primary.id} (${bundle.primary.type})`
    );
    lines.push(`  title: ${bundle.primary.title}`);
    lines.push(`  summary: ${bundle.primary.summary}`);
    lines.push("");
  }

  const nodes = Object.values(bundle.byId);

  const departments = nodes.filter(
    (n) => n.type === "department"
  );
  const teams = nodes.filter((n) => n.type === "team");
  const roles = nodes.filter((n) => n.type === "role");
  const people = nodes.filter((n) => n.type === "person");

  function pushSection(
    title: string,
    nodeList: OrgLoopbrainContextObject[],
    maxItems: number
  ) {
    if (nodeList.length === 0) return;

    lines.push(`${title}:`);

    const slice = nodeList.slice(0, maxItems);
    for (const node of slice) {
      const summary =
        node.summary.length > 180
          ? node.summary.slice(0, 177) + "..."
          : node.summary;

      lines.push(
        `  - [${node.id}] ${node.title} — ${summary}`
      );
    }

    if (nodeList.length > maxItems) {
      lines.push(
        `  ... (+${nodeList.length - maxItems} more)`
      );
    }

    lines.push("");
  }

  pushSection("Departments", departments, 15);
  pushSection("Teams", teams, 30);
  pushSection("Roles", roles, 30);
  pushSection("People", people, 50);

  // Relations: show only the most important org relations
  lines.push("Key Relations (subset):");

  const relationLines: string[] = [];

  function addRelationLinesForNode(
    node: OrgLoopbrainContextObject
  ) {
    for (const rel of node.relations) {
      if (
        rel.type === "reports_to" ||
        rel.type === "manages" ||
        rel.type === "member_of_team" ||
        rel.type === "member_of_department" ||
        rel.type === "has_team" ||
        rel.type === "has_member" ||
        rel.type === "has_role" ||
        rel.type === "has_department" ||
        rel.type === "owns" ||
        rel.type === "owned_by" ||
        rel.type === "responsible_for"
      ) {
        relationLines.push(
          `  - ${rel.type}: ${rel.sourceId} -> ${rel.targetId}`
        );
      }
    }
  }

  for (const node of nodes) {
    addRelationLinesForNode(node);
    if (relationLines.length > 150) break; // Keep it bounded
  }

  if (relationLines.length === 0) {
    lines.push("  (no relations found)");
  } else {
    lines.push(...relationLines.slice(0, 150));
    if (relationLines.length > 150) {
      lines.push(
        `  ... (+${relationLines.length - 150} more)`
      );
    }
  }

  lines.push("");
  lines.push(
    "Use this graph as the source of truth for Org questions (reporting lines, teams, departments, roles, ownership, etc.)."
  );
  lines.push("</ORG_GRAPH>");

  return lines.join("\n");
}

