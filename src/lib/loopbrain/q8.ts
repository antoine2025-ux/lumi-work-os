/**
 * Loopbrain Q8: "Is responsibility clear or fragmented?"
 * 
 * Project-scoped question that assesses accountability completeness.
 */

import type { Q8Response } from "./types";
import { deriveProjectAccountability } from "@/lib/org";

type ProjectWithAccountability = { accountability?: Parameters<typeof deriveProjectAccountability>[0] | null };

export async function answerQ8(args: {
  projectId: string;
  project: ProjectWithAccountability;
}): Promise<Q8Response> {
  const acct = deriveProjectAccountability(args.project.accountability ?? undefined);

  const missing = acct.missing; // ["owner","decision"] depending on derive function

  // Semantics:
  // - clear: owner+decision set
  // - fragmented: missing owner or decision
  // - unknown: project missing or no accountability object at all (handled by route)
  const status = missing.length === 0 ? "clear" : "fragmented";

  const constraints: string[] = [];
  if (missing.includes("owner")) {
    constraints.push("Owner not defined");
  }
  if (missing.includes("decision")) {
    constraints.push("Decision authority not defined");
  }

  const confidence: "high" | "medium" | "low" = missing.length === 0 ? "high" : "medium";

  return {
    questionId: "Q8",
    assumptions: [],
    constraints,
    risks: [],
    confidence,
    projectId: args.projectId,
    status,
    missing,
  };
}

