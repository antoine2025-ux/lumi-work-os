/**
 * Loopbrain Q2: "Who decides this?"
 * 
 * Reads ProjectAccountability.decision and escalation.
 */

import type { Q2Response } from "./types";
import { deriveProjectAccountability, type AccountabilityValue } from "@/lib/org";

type ProjectWithAccountability = { accountability?: Parameters<typeof deriveProjectAccountability>[0] | null };

export async function answerQ2(args: {
  project: ProjectWithAccountability;
  peopleById?: Record<string, { name: string }>;
}): Promise<Q2Response> {
  const acct = deriveProjectAccountability(args.project.accountability ?? undefined);

  function resolve(v: AccountabilityValue): AccountabilityValue & { name?: string } {
    if (v.type === "person") {
      const name = args.peopleById?.[v.personId]?.name;
      return { ...v, name };
    }
    return v;
  }

  const decision = resolve(acct.decision);
  const escalation = resolve(acct.escalation);

  const constraints: string[] = [];
  let confidence: "high" | "medium" | "low" = "high";

  if (decision.type === "unset") {
    constraints.push("Decision authority not defined in Org");
    confidence = "low";
  }
  if (escalation.type === "unset") {
    constraints.push("Escalation path not defined in Org");
    confidence = confidence === "low" ? "low" : "medium";
  }

  return {
    questionId: "Q2",
    assumptions: [],
    constraints,
    risks: [],
    confidence,
    decision,
    escalation,
  };
}

