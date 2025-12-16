// src/lib/context/org/loadOrgContextBundle.ts

import { prisma } from "@/lib/db";

// If you have a shared ContextItem type, import it; otherwise define a minimal shape:
export interface ContextItemRecord {
  id: string;
  contextId: string;
  workspaceId: string;
  type: string;
  title: string;
  summary: string | null;
  data: unknown;
  updatedAt: Date;
}

export interface OrgContextBundle {
  org: ContextItemRecord | null;
  departments: ContextItemRecord[];
  teams: ContextItemRecord[];
  roles: ContextItemRecord[];
  people: ContextItemRecord[];
}

/**
 * Load OrgContextBundle for a given workspace from the Context Store.
 * This is read-only and based on ContextItem rows (no writes).
 */
export async function loadOrgContextBundle(
  workspaceId: string
): Promise<OrgContextBundle> {
  if (!workspaceId) {
    throw new Error("loadOrgContextBundle: workspaceId is required");
  }

  // We care only about org-related types
  const types = ["org", "department", "team", "role", "person"];

  const items = await prisma.contextItem.findMany({
    where: {
      workspaceId,
      type: {
        in: types,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const orgItems: ContextItemRecord[] = [];
  const departmentItems: ContextItemRecord[] = [];
  const teamItems: ContextItemRecord[] = [];
  const roleItems: ContextItemRecord[] = [];
  const personItems: ContextItemRecord[] = [];

  for (const item of items) {
    const record: ContextItemRecord = {
      id: item.id,
      contextId: item.contextId,
      workspaceId: item.workspaceId,
      type: item.type,
      title: item.title,
      summary: item.summary ?? null,
      data: item.data,
      updatedAt: item.updatedAt,
    };

    switch (item.type) {
      case "org":
        orgItems.push(record);
        break;
      case "department":
        departmentItems.push(record);
        break;
      case "team":
        teamItems.push(record);
        break;
      case "role":
        roleItems.push(record);
        break;
      case "person":
        personItems.push(record);
        break;
      default:
        // ignore non-org types
        break;
    }
  }

  // We treat the most recently updated org item as canonical
  const org = orgItems.length > 0 ? orgItems[0] : null;

  return {
    org,
    departments: departmentItems,
    teams: teamItems,
    roles: roleItems,
    people: personItems,
  };
}

