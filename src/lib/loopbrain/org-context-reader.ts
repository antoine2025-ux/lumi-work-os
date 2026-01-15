import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

export type OrgContextRelation = {
  type: string;
  sourceId: string;
  targetId: string;
  label?: string;
};

export type OrgContextObject = {
  id: string;
  type: string;
  title: string;
  summary: string;
  tags: string[];
  relations: OrgContextRelation[];
  owner: string | null;
  status: string;
  updatedAt: string;
};

export type OrgContextSlice = {
  root: OrgContextObject | null;
  people: OrgContextObject[];
  teams: OrgContextObject[];
  departments: OrgContextObject[];
  positions: OrgContextObject[];
  all: OrgContextObject[];
};

/**
 * Fetch all Org context objects from ContextItem for a given workspace.
 * This reads only persisted ContextItems with type = "org".
 */
export async function fetchOrgContextSliceForWorkspace(
  workspaceId: string
): Promise<OrgContextSlice> {
  const items = await prisma.contextItem.findMany({
    where: {
      workspaceId,
      type: "org",
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const all: OrgContextObject[] = [];

  for (const item of items) {
    // data is stored as the full OrgContextObject (see org-context-store.ts)
    // We trust its shape but still cast defensively.
    const data = item.data as any;

    if (!data || typeof data !== "object") {
      continue;
    }

    const obj: OrgContextObject = {
      id: String(data.id ?? item.contextId),
      type: String(data.type ?? "unknown"),
      title: String(data.title ?? item.title ?? ""),
      summary: String(data.summary ?? item.summary ?? ""),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      relations: Array.isArray(data.relations)
        ? data.relations.map((rel: any) => ({
            type: String(rel.type ?? ""),
            sourceId: String(rel.sourceId ?? ""),
            targetId: String(rel.targetId ?? ""),
            label: rel.label ? String(rel.label) : undefined,
          }))
        : [],
      owner: data.owner ? String(data.owner) : null,
      status: String(data.status ?? "ACTIVE"),
      updatedAt: String(data.updatedAt ?? item.updatedAt.toISOString()),
    };

    all.push(obj);
  }

  const root =
    all.find((obj) => obj.type === "org") ??
    all.find((obj) => obj.id.startsWith("org:")) ??
    null;

  const people = all.filter((obj) => obj.type === "person");
  const teams = all.filter((obj) => obj.type === "team");
  const departments = all.filter((obj) => obj.type === "department");
  const positions = all.filter((obj) => obj.type === "position");

  return {
    root,
    people,
    teams,
    departments,
    positions,
    all,
  };
}

/**
 * Convenience helper: fetch Org context slice for the *current* workspace.
 */
export async function fetchOrgContextSliceForCurrentWorkspace(request?: NextRequest): Promise<OrgContextSlice> {
  const workspaceId = await getCurrentWorkspaceId(request);
  if (!workspaceId) {
    throw new Error('No workspace found');
  }
  return fetchOrgContextSliceForWorkspace(workspaceId);
}

/**
 * Small helper that returns a compact summary object suitable for logging or debug.
 */
export async function fetchOrgContextSummaryForCurrentWorkspace(request?: NextRequest): Promise<{
  workspaceId: string;
  rootId: string | null;
  total: number;
  people: number;
  teams: number;
  departments: number;
  positions: number;
}> {
  const workspaceId = await getCurrentWorkspaceId(request);
  if (!workspaceId) {
    throw new Error('No workspace found');
  }
  const slice = await fetchOrgContextSliceForWorkspace(workspaceId);

  return {
    workspaceId,
    rootId: slice.root?.id ?? null,
    total: slice.all.length,
    people: slice.people.length,
    teams: slice.teams.length,
    departments: slice.departments.length,
    positions: slice.positions.length,
  };
}

