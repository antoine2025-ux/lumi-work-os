/**
 * Loopbrain Q7: "Is responsibility aligned with role and responsibilities?"
 * 
 * Evaluates alignment between project accountability and role responsibilities.
 */

import type { Q7Response } from "./types";
import { deriveProjectAccountability } from "@/lib/org";
import { deriveRoleProfile, deriveRoleAlignment } from "@/lib/org";

export async function answerQ7(args: {
  projectId: string;
  project: any;
  rolesByName: Record<
    string,
    {
      name: string;
      responsibilities: { scope: string; target: string }[];
    }
  >;
}): Promise<Q7Response> {
  const acct = deriveProjectAccountability(args.project.accountability);

  const notes: string[] = [];
  const constraints: string[] = [];
  let confidence: "high" | "medium" | "low" = "medium";

  function align(roleName: string | undefined, type: "owner" | "decision") {
    if (!roleName) {
      return { status: "unknown" as const, reason: "No role set" };
    }

    const role = args.rolesByName[roleName];
    if (!role) {
      return { status: "unknown" as const, reason: "Role not found in catalog" };
    }

    const profile = deriveRoleProfile(role as any);
    const res = deriveRoleAlignment({
      roleProfile: {
        ownershipScopes: profile.ownershipScopes,
        decisionScopes: profile.decisionScopes,
      },
      projectName: args.project.name || "Unknown Project",
      accountabilityType: type,
    });

    return res;
  }

  let ownerAlignment: any = undefined;
  let decisionAlignment: any = undefined;

  if (acct.owner.type === "role") {
    ownerAlignment = align(acct.owner.role, "owner");
    if (ownerAlignment.status === "unknown") {
      constraints.push(`Owner role alignment unknown: ${ownerAlignment.reason}`);
    }
    if (ownerAlignment.status === "misaligned") {
      notes.push("Owner role may not explicitly cover this project type");
    }
  } else if (acct.owner.type === "person") {
    notes.push("Owner is person-based; role alignment not evaluated (v1)");
  } else {
    constraints.push("Owner not defined");
    confidence = "low";
  }

  if (acct.decision.type === "role") {
    decisionAlignment = align(acct.decision.role, "decision");
    if (decisionAlignment.status === "unknown") {
      constraints.push(
        `Decision role alignment unknown: ${decisionAlignment.reason}`
      );
    }
    if (decisionAlignment.status === "misaligned") {
      notes.push("Decision role may not explicitly cover this project type");
    }
  } else if (acct.decision.type === "person") {
    notes.push(
      "Decision authority is person-based; role alignment not evaluated (v1)"
    );
    confidence = confidence === "low" ? "low" : "medium";
  } else {
    constraints.push("Decision authority not defined");
    confidence = "low";
  }

  // Confidence adjustments
  if (constraints.length > 0) {
    confidence = "low";
  }
  if (
    (ownerAlignment?.status === "aligned" ||
      ownerAlignment?.status === "misaligned") &&
    (decisionAlignment?.status === "aligned" ||
      decisionAlignment?.status === "misaligned")
  ) {
    confidence = constraints.length === 0 ? "high" : confidence;
  }

  return {
    questionId: "Q7",
    assumptions: [],
    constraints,
    risks: [],
    confidence,
    projectId: args.projectId,
    ownerAlignment,
    decisionAlignment,
    notes,
  };
}

