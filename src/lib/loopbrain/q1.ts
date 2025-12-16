/**
 * Loopbrain Q1: "Who owns this?"
 * 
 * Simple question that reads ProjectAccountability.owner directly.
 */

import type { Q1Response } from "./types";
import { deriveProjectAccountability } from "@/lib/org";

export async function answerQ1(args: {
  project: any;
  peopleById?: Record<string, { name: string }>;
}): Promise<Q1Response> {
  const acct = deriveProjectAccountability(args.project.accountability);

  let owner: any = acct.owner;
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

