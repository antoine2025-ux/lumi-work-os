/**
 * Loopbrain Q1: "Who owns this?"
 * 
 * Simple question that reads ProjectAccountability.owner directly.
 */

import type { Q1Response } from "./types";
import { deriveProjectAccountability, type AccountabilityValue } from "@/lib/org";

type ProjectWithAccountability = { accountability?: Parameters<typeof deriveProjectAccountability>[0] | null };

export async function answerQ1(args: {
  project: ProjectWithAccountability;
  peopleById?: Record<string, { name: string }>;
}): Promise<Q1Response> {
  const acct = deriveProjectAccountability(args.project.accountability ?? undefined);

  let owner: AccountabilityValue & { name?: string } = acct.owner;
  if (owner.type === "person") {
    const name = args.peopleById?.[owner.personId]?.name;
    owner = { ...owner, name };
  }

  return {
    questionId: "Q1",
    assumptions: [],
    constraints: acct.owner.type === "unset" ? ["Owner not defined in Org"] : [],
    risks: [],
    confidence: acct.owner.type === "unset" ? "low" : "high",
    owner,
  };
}

