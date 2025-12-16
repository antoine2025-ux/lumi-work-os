/**
 * Loopbrain Q9: "Should we proceed, reassign, delay, or request support?"
 * 
 * Meta-reasoning question that synthesizes Q1-Q8 signals into decision framing options.
 * Does NOT assign work or promise outcomes.
 */

import type { Q9Response, Q9Option } from "./types";
import { answerQ1 } from "./q1";
import { answerQ2 } from "./q2";
import { answerQ3 } from "./reasoning/q3";
import { answerQ4 } from "./reasoning/q4";
import { answerQ7 } from "./q7";
import { answerQ8 } from "./q8";

export async function answerQ9(args: {
  projectId: string;
  workspaceId: string;
  project: any;
  peopleById: Record<string, { name: string }>;
  rolesByName: Record<string, any>;
  timeframe?: { start?: Date; end?: Date };
}): Promise<Q9Response> {
  // Gather evidence from Q1-Q8
  const [q1, q2, q8, q7] = await Promise.all([
    answerQ1({ project: args.project, peopleById: args.peopleById }),
    answerQ2({ project: args.project, peopleById: args.peopleById }),
    answerQ8({ projectId: args.projectId, project: args.project }),
    answerQ7({
      projectId: args.projectId,
      project: args.project,
      rolesByName: args.rolesByName,
    }),
  ]);

  const ownershipSet = q1.owner.type !== "unset";
  const decisionSet = q2.decision.type !== "unset";
  const fragmented = q8.status === "fragmented";

  // Get Q3 to check for candidates (availability/allocations signal)
  let q3Result;
  try {
    q3Result = await answerQ3(args.projectId, args.workspaceId);
  } catch (error) {
    // If Q3 fails, treat as unknown
    q3Result = null;
  }

  // Capacity feasibility only if timeframe provided
  let capacityAssessment:
    | "likely_feasible"
    | "possibly_feasible"
    | "unlikely_feasible"
    | "insufficient_data"
    | undefined = undefined;

  if (args.timeframe?.end) {
    try {
      const q4 = await answerQ4(
        args.projectId,
        args.workspaceId,
        {
          startDate: args.timeframe.start ?? new Date(),
          endDate: args.timeframe.end,
        }
      );
      capacityAssessment = q4.feasibility;
    } catch (error) {
      capacityAssessment = "insufficient_data";
    }
  }

  // Build evidence summary
  const evidence: Q9Response["evidence"] = {
    ownership: ownershipSet ? "set" : "missing",
    decisionAuthority: decisionSet ? "set" : "missing",
    availability: q3Result && q3Result.viableCandidates.length > 0 ? "known" : "unknown",
    allocations: q3Result && q3Result.viableCandidates.length > 0 ? "known" : "unknown",
    capacityAssessment,
    roleAlignment: {
      owner: q7.ownerAlignment?.status,
      decision: q7.decisionAlignment?.status,
    },
    fragmentation: q8.status,
  };

  // Determine primary action (framing, not command)
  const explanation: string[] = [];
  const constraints: string[] = [];
  const risks: string[] = [];

  // Hard blockers to proceed
  if (!ownershipSet || !decisionSet) {
    constraints.push(...(q1.constraints || []), ...(q2.constraints || []));
  }
  if (fragmented) {
    constraints.push(
      "Responsibility is fragmented (missing owner and/or decision authority)"
    );
  }

  if (
    q7.ownerAlignment?.status === "misaligned" ||
    q7.decisionAlignment?.status === "misaligned"
  ) {
    risks.push("Potential role responsibility misalignment");
  }

  if (!args.timeframe?.end) {
    constraints.push(
      "Timeframe not provided; capacity feasibility cannot be assessed"
    );
  } else if (capacityAssessment === "unlikely_feasible") {
    risks.push("Capacity feasibility is unlikely for the given timeframe");
  } else if (capacityAssessment === "insufficient_data") {
    constraints.push(
      "Insufficient capacity data to assess feasibility for the timeframe"
    );
  }

  // Decision action selection rules (conservative)
  let action: Q9Response["decision"]["action"] = "proceed";

  if (!ownershipSet || !decisionSet || fragmented) {
    action = "reassign";
    explanation.push(
      "Define accountability (owner + decision authority) before proceeding."
    );
  }

  if (args.timeframe?.end && capacityAssessment === "unlikely_feasible") {
    action = action === "reassign" ? "reassign" : "delay";
    explanation.push("Capacity appears insufficient for the requested timeframe.");
  }

  if (!args.timeframe?.end || capacityAssessment === "insufficient_data") {
    if (action === "proceed") {
      action = "insufficient_data";
      explanation.push(
        "Provide timeframe and/or record allocations/availability to assess feasibility."
      );
    }
  }

  // Options list (always provide; minimal set)
  const options: Q9Option[] = [];

  options.push({
    action: "proceed",
    title: "Proceed with current plan",
    rationale: [
      "Ownership and decision authority are defined",
      args.timeframe?.end
        ? "Timeframe provided"
        : "Timeframe not provided (risk)",
    ].filter(Boolean) as string[],
    prerequisites: [
      ...(ownershipSet ? [] : ["Set project owner"]),
      ...(decisionSet ? [] : ["Set decision authority"]),
    ],
    risks: [
      ...(q7.ownerAlignment?.status === "misaligned" ||
      q7.decisionAlignment?.status === "misaligned"
        ? ["Potential role misalignment"]
        : []),
      ...(args.timeframe?.end && capacityAssessment === "unlikely_feasible"
        ? ["Capacity likely insufficient for timeframe"]
        : []),
    ],
  });

  options.push({
    action: "reassign",
    title: "Reassign or clarify accountability",
    rationale: [
      "Reduces ambiguity and prevents bottlenecks",
      "Improves escalation paths and decision-making under pressure",
    ],
    prerequisites: [
      ...(ownershipSet ? [] : ["Define owner (person or role)"]),
      ...(decisionSet ? [] : ["Define decision authority (person or role)"]),
      "Confirm escalation path",
    ],
  });

  options.push({
    action: "delay",
    title: "Delay or adjust timeframe",
    rationale: [
      "May be necessary if capacity is constrained",
      "Reduces delivery risk under partial availability or heavy allocations",
    ],
    prerequisites: args.timeframe?.end
      ? ["Recheck allocations/availability within the window"]
      : ["Provide timeframe to evaluate feasibility"],
  });

  options.push({
    action: "request_support",
    title: "Request support (additional capacity or cross-team help)",
    rationale: [
      "Mitigates tight capacity without changing ownership",
      "Useful when the timeline is fixed but capacity is constrained",
    ],
    prerequisites: [
      "Identify support source (team or role)",
      "Confirm decision authority for staffing tradeoffs",
    ],
    risks: ["May require reprioritization elsewhere"],
  });

  // Confidence for Q9
  let confidence: "high" | "medium" | "low" = "medium";
  if (constraints.length > 0) {
    confidence = "low";
  }
  if (
    constraints.length === 0 &&
    (capacityAssessment === "likely_feasible" ||
      capacityAssessment === "possibly_feasible")
  ) {
    confidence = "high";
  }

  return {
    questionId: "Q9",
    timeframe: args.timeframe?.end
      ? {
          start: (args.timeframe.start ?? new Date()).toISOString(),
          end: args.timeframe.end.toISOString(),
        }
      : undefined,
    assumptions: [],
    constraints,
    risks,
    confidence,
    projectId: args.projectId,
    decision: {
      action,
      explanation:
        explanation.length > 0
          ? explanation
          : ["No hard blockers detected based on current Org data."],
    },
    options,
    evidence,
  };
}

