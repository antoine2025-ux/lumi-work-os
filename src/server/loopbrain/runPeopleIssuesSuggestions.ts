/**
 * Run people_issues suggestions for an org (proactive / cron).
 * Suggest-only: computes and stores suggestions; does not apply.
 * Caller is responsible for rollout and rate limits.
 */

import { prisma } from "@/lib/db";
import { selectEngineForOrg } from "./selectEngine";
import crypto from "crypto";

export type RunPeopleIssuesResult =
  | { ok: true; suggestionRunId: string; suggestionCount: number; engineId: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; error: string };

/**
 * Run the people_issues engine for the given org and persist the run.
 * Uses workspaceId to load OrgPositions (workspace-scoped); orgId for engine config and rollout.
 * When getOrgContext uses workspace fallback, orgId === workspaceId.
 *
 * Rollout: caller should check OrgLoopBrainRollout.enabled before calling, or this will run regardless.
 * For cron, check rollout in the API route and only call when enabled.
 */
export async function runPeopleIssuesSuggestionsForOrg(args: {
  workspaceId: string;
}): Promise<RunPeopleIssuesResult> {
  const { workspaceId } = args;

  const rollout = await prisma.orgLoopBrainRollout.findUnique({
    where: { workspaceId_scope: { workspaceId, scope: "people_issues" } },
  });

  if (!rollout || !rollout.enabled) {
    return { ok: false, skipped: true, reason: "rollout disabled or not configured" };
  }

  const positions = await prisma.orgPosition.findMany({
    where: {
      workspaceId,
      isActive: true,
      archivedAt: null,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      team: {
        select: { id: true, name: true },
      },
      parent: {
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  const people = positions.map((pos) => ({
    id: pos.id,
    name: pos.user?.name || "Unnamed",
    email: pos.user?.email ?? null,
    title: pos.title,
    role: pos.title,
    teamName: pos.team?.name ?? null,
    team: pos.team?.name ?? null,
    managerId: pos.parent?.user?.id ?? null,
    managerName: pos.parent?.user?.name ?? null,
  }));

  const { engine, engineId } = await selectEngineForOrg({ workspaceId, scope: "people_issues" });
  const suggestions = await engine.run({
    context: { workspaceId, scope: "people_issues" },
    people,
    allPeople: people,
  });

  const preview = people.map((p) => {
    const s = suggestions.find((x) => x.personId === p.id);
    const patch = s?.patch ?? {};
    return {
      personId: p.id,
      person: {
        id: p.id,
        name: p.name,
        email: p.email,
        teamName: p.teamName ?? p.team,
        managerName: p.managerName,
      },
      confidence: s?.confidence ?? 0,
      rationale: s?.rationale ?? "",
      evidence: s?.evidence ?? [],
      patch,
      diffs: Object.keys(patch)
        .filter((k) => (patch as Record<string, unknown>)[k] !== undefined)
        .map((k) => ({
          field: k,
          before: (p as Record<string, unknown>)[k] ?? null,
          after: (patch as Record<string, unknown>)[k] ?? null,
        })),
    };
  });

  const inputHash = crypto.createHash("sha256").update(JSON.stringify({ workspaceId, count: people.length })).digest("hex");

  const run = await prisma.orgSuggestionRun.create({
    data: {
      workspaceId, // Prisma field orgId will be migrated separately
      scope: "people_issues",
      inputHash,
      output: preview as unknown as object,
      engineId,
      modelId: engineId,
    },
  });

  return {
    ok: true,
    suggestionRunId: run.id,
    suggestionCount: suggestions.length,
    engineId,
  };
}
