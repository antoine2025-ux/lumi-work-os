// src/lib/org/context/mapRoleContextToContextObject.ts

import type { RoleContext } from "./roleContextTypes";
import type {
  OrgLoopbrainContextObject,
  OrgLoopbrainRelation,
} from "@/lib/loopbrain/org/types";

/**
 * Build a compact summary from RoleContext data.
 * Combines description, responsibilities, and key metrics.
 */
function buildRoleSummary(role: RoleContext): string {
  const parts: string[] = [];

  if (role.roleDescription) {
    parts.push(role.roleDescription);
  }

  if (role.responsibilities.length > 0) {
    parts.push(
      `Key responsibilities: ${role.responsibilities.slice(0, 5).join(", ")}`
    );
  }

  if (role.keyMetrics.length > 0) {
    parts.push(
      `Key metrics: ${role.keyMetrics.slice(0, 5).join(", ")}`
    );
  }

  // Max ~3–4 lines; keep it compact.
  return parts.join(" ").trim().slice(0, 600);
}

/**
 * Build standardized tags for a RoleContext.
 * Includes role type, level, job family, team/department, source, and ownership status.
 */
function buildRoleTags(role: RoleContext): string[] {
  const tags: string[] = [];

  tags.push("role");

  if (role.level !== null && role.level !== undefined && role.level !== "") {
    tags.push(`level:${String(role.level)}`);
  }

  if (role.jobFamily) {
    tags.push(`job_family:${role.jobFamily}`);
  }

  if (role.teamId) {
    tags.push(`team:${role.teamId}`);
  }

  if (role.departmentId) {
    tags.push(`department:${role.departmentId}`);
  }

  tags.push(`source:${role.sourceType}`);

  if (role.responsibilities.length > 0) {
    tags.push(`responsibilities:${role.responsibilities.length}`);
  }

  if (role.userId) {
    tags.push(`has_owner:true`);
  } else {
    tags.push(`has_owner:false`);
  }

  return tags;
}

/**
 * Build relationship edges for a RoleContext.
 * Encodes team/department membership, reporting hierarchy, ownership, and responsibilities.
 */
function buildRoleRelations(role: RoleContext): OrgLoopbrainRelation[] {
  const relations: OrgLoopbrainRelation[] = [];

  // Member of team
  if (role.teamId) {
    relations.push({
      type: "member_of_team",
      sourceId: role.id,
      targetId: `team:${role.teamId}`,
      label: "Role belongs to team",
    });
  }

  // Member of department
  if (role.departmentId) {
    relations.push({
      type: "member_of_department",
      sourceId: role.id,
      targetId: `department:${role.departmentId}`,
      label: "Role belongs to department",
    });
  }

  // Reports-to hierarchy (role → parent role)
  if (role.reportsToRoleId) {
    // Convert parent position ID to canonical role ID format
    // reportsToRoleId is stored as OrgPosition.id, so we need to convert it
    const parentRoleId = role.reportsToRoleId.startsWith("role:")
      ? role.reportsToRoleId
      : `role:${role.workspaceId}:position:${role.reportsToRoleId}`;

    relations.push({
      type: "reports_to",
      sourceId: role.id,
      targetId: parentRoleId,
      label: "Role reports to role",
    });
  }

  // Ownership (person ↔ role)
  if (role.userId) {
    relations.push({
      type: "owned_by",
      sourceId: role.id,
      targetId: `person:${role.userId}`,
      label: "Role held by person",
    });

    relations.push({
      type: "owns",
      sourceId: `person:${role.userId}`,
      targetId: role.id,
      label: "Person holds role",
    });
  }

  // Responsibilities as edges (role → responsibility text)
  // NOTE: We treat these as implicit descriptors, not separate nodes (for now).
  // We still encode a generic "responsible_for" relation referencing the role itself
  // to help the model anchor reasoning.
  if (role.responsibilities.length > 0) {
    relations.push({
      type: "responsible_for",
      sourceId: role.id,
      targetId: role.id,
      label: "Role is responsible for listed responsibilities (see summary)",
    });
  }

  return relations;
}

/**
 * Map a RoleContext to a Loopbrain ContextObject (type: "role").
 * 
 * This transforms our internal RoleContext representation into a fully-formed
 * OrgLoopbrainContextObject that can be used in the Org graph.
 */
export function mapRoleContextToContextObject(
  role: RoleContext
): OrgLoopbrainContextObject {
  const summary = buildRoleSummary(role);
  const tags = buildRoleTags(role);
  const relations = buildRoleRelations(role);

  const updatedAt = role.updatedAt.toISOString();

  return {
    id: role.id,
    type: "role",
    title: role.title || "Untitled Role",
    summary: summary || "Organizational role definition.",
    tags,
    relations,
    owner: role.userId ? `person:${role.userId}` : null,
    status: "ACTIVE",
    updatedAt,
  };
}

