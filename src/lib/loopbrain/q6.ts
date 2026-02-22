/**
 * Loopbrain Q6: "Who can cover this if the primary owner is unavailable?"
 * 
 * Returns candidates for coverage, not recommendations.
 */

import type { Q6Response } from "./types";
import { deriveProjectAccountability, type AccountabilityValue } from "@/lib/org";

type ProjectWithAccountability = { accountability?: Parameters<typeof deriveProjectAccountability>[0] | null };
type ResolvedValue = AccountabilityValue & { name?: string };

export async function answerQ6(args: {
  projectId: string;
  project: ProjectWithAccountability;
  peopleById: Record<
    string,
    {
      name: string;
      teamId?: string | null;
      teamName?: string | null;
      roleName?: string | null;
    }
  >;
  allocations?: Array<{
    personId: string;
    projectId: string;
    fraction: number;
    startDate: Date;
    endDate?: Date | null;
  }>;
}): Promise<Q6Response> {
  const acct = deriveProjectAccountability(args.project.accountability ?? undefined);

  const candidates: Q6Response["candidates"] = [];

  function resolveValue(v: AccountabilityValue): ResolvedValue {
    if (v.type === "person") {
      const p = args.peopleById[v.personId];
      return { ...v, name: p?.name };
    }
    return v;
  }

  const primaryOwner = resolveValue(acct.owner);

  // 1) Prefer explicit backups if available in your derive model (v1.1)
  const backupOwner = resolveValue(acct.backupOwner ?? { type: "unset" });
  const backupDecision = resolveValue(acct.backupDecision ?? { type: "unset" });

  if (backupOwner.type !== "unset") {
    if (backupOwner.type === "person") {
      candidates.push({
        type: "person",
        personId: backupOwner.personId,
        name: backupOwner.name,
        source: "explicit_backup",
        notes: ["Explicit backup owner recorded in Org"],
      });
    } else {
      candidates.push({
        type: "role",
        role: backupOwner.role,
        source: "explicit_backup",
        notes: ["Explicit backup owner role recorded in Org"],
      });
    }
  }

  // 2) Same role as owner (if owner is role)
  if (acct.owner.type === "role") {
    const role = acct.owner.role;
    const holders = Object.entries(args.peopleById)
      .filter(([, p]) => (p.roleName ?? "") === role)
      .map(([id, p]) => ({ id, name: p.name }));

    for (const h of holders) {
      candidates.push({
        type: "person",
        personId: h.id,
        name: h.name,
        source: "same_role",
        notes: ["Same role as owner"],
      });
    }
  }

  // 3) Same team as owner (if owner is person with team)
  if (acct.owner.type === "person") {
    const ownerPersonId = acct.owner.personId;
    const ownerPerson = args.peopleById[ownerPersonId];
    const teamKey = ownerPerson?.teamId || ownerPerson?.teamName || null;

    if (teamKey) {
      const teamMates = Object.entries(args.peopleById)
        .filter(([id]) => id !== ownerPersonId)
        .filter(([, p]) => (p.teamId || p.teamName) === teamKey)
        .map(([id, p]) => ({ id, name: p.name }));

      for (const m of teamMates) {
        candidates.push({
          type: "person",
          personId: m.id,
          name: m.name,
          source: "same_team",
          notes: ["Same team as primary owner"],
        });
      }
    }
  }

  // 4) People already allocated to the project (continuity)
  const allocPeople = (args.allocations ?? [])
    .filter((a) => a.projectId === args.projectId)
    .map((a) => a.personId);

  for (const pid of allocPeople) {
    const p = args.peopleById[pid];
    if (!p) continue;
    candidates.push({
      type: "person",
      personId: pid,
      name: p.name,
      source: "allocated_to_project",
      notes: ["Already allocated to project"],
    });
  }

  // Deduplicate candidates by personId/role+source
  const seen = new Set<string>();
  const deduped = candidates.filter((c) => {
    const key =
      c.type === "person"
        ? `p:${c.personId}`
        : `r:${c.role}:${c.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const constraints: string[] = [];
  let confidence: "high" | "medium" | "low" = "medium";

  if (acct.owner.type === "unset") {
    constraints.push("Owner not defined; coverage candidates are generic");
    confidence = "low";
  }

  if (deduped.length === 0) {
    constraints.push(
      "No explicit backups, role holders, team mates, or allocated people found"
    );
    confidence = "low";
  }

  return {
    questionId: "Q6",
    assumptions: [],
    constraints,
    risks: [],
    confidence,
    projectId: args.projectId,
    primaryOwner,
    backups: {
      backupOwner,
      backupDecision: backupDecision.type === "unset" ? undefined : backupDecision,
    },
    candidates: deduped,
  };
}

