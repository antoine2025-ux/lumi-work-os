/**
 * Loopbrain Q4 Reasoning: "Do we actually have capacity to do this in the given timeframe?"
 * 
 * Spec: Q4.v1
 * Depends on: Org v1 + Q3 implementation
 * 
 * This function implements the deterministic reasoning pipeline for Q4,
 * using Org v1 as a read-only context substrate and Q3 for candidate identification.
 */

import { prisma } from "@/lib/db";
import {
  deriveEffectiveCapacity,
  deriveCurrentAvailability,
  activeAllocationsAt,
} from "@/lib/org";
import { answerQ3, type Q3Output } from "./q3";

// ============================================================================
// Types
// ============================================================================

export type Q4Feasibility = "likely_feasible" | "possibly_feasible" | "unlikely_feasible" | "insufficient_data";

export type Q4Confidence = "high" | "medium" | "low";

export type Q4Timeframe = {
  startDate: Date;
  endDate: Date;
  durationWeeks?: number; // Optional, for convenience
};

export type Q4Assumption = {
  type: "timeframe" | "availability" | "allocation" | "ownership" | "capacity";
  description: string;
};

export type Q4Risk = {
  type:
    | "single_point_dependency"
    | "partial_availability"
    | "overallocation"
    | "role_misalignment"
    | "ownership_unclear"
    | "tight_margins"
    | "availability_gap"
    | "concentration_risk"
    | "data_gap";
  description: string;
  severity: "high" | "medium" | "low";
};

export type Q4CapacitySummary = {
  totalEffectiveCapacity: number; // 0..1, aggregated across timeframe
  contributorCount: number;
  concentrationRisk: "high" | "medium" | "low";
  fragmentationLevel: "high" | "medium" | "low";
  timeDistribution: "even" | "front_loaded" | "back_loaded" | "constrained_early" | "constrained_late";
  qualitativeDescription: string; // Human-readable capacity summary
};

export type Q4Refusal = {
  reason: string;
  details: string[];
};

export type Q4Output = {
  feasibility: Q4Feasibility;
  assumptions: Q4Assumption[];
  capacitySummary: Q4CapacitySummary;
  risks: Q4Risk[];
  confidence: Q4Confidence;
  refusal?: Q4Refusal; // Only if refusing to answer
};

// ============================================================================
// Main Function
// ============================================================================

export async function answerQ4(
  projectId: string,
  workspaceId: string,
  timeframe: Q4Timeframe | { startDate?: Date; endDate?: Date; durationWeeks?: number }
): Promise<Q4Output> {
  // Step 0: Validate timeframe
  const validatedTimeframe = validateTimeframe(timeframe);
  if (!validatedTimeframe) {
    return {
      feasibility: "insufficient_data",
      assumptions: [],
      capacitySummary: {
        totalEffectiveCapacity: 0,
        contributorCount: 0,
        concentrationRisk: "high",
        fragmentationLevel: "low",
        timeDistribution: "even",
        qualitativeDescription: "No capacity data available",
      },
      risks: [],
      confidence: "low",
      refusal: {
        reason: "Timeframe not provided or invalid",
        details: [
          "Q4 requires an explicit timeframe with start and end dates.",
          "Please provide startDate and endDate, or startDate and durationWeeks.",
        ],
      },
    };
  }

  const { startDate, endDate } = validatedTimeframe;

  // Step 1: Establish execution boundary using Q3
  const q3Result = await answerQ3(projectId, workspaceId);

  // If Q3 refused, propagate refusal
  if (q3Result.refusal) {
    return {
      feasibility: "insufficient_data",
      assumptions: [
        {
          type: "capacity",
          description: "Q3 could not identify viable candidates",
        },
      ],
      capacitySummary: {
        totalEffectiveCapacity: 0,
        contributorCount: 0,
        concentrationRisk: "high",
        fragmentationLevel: "low",
        timeDistribution: "even",
        qualitativeDescription: "No capacity data available",
      },
      risks: [
        {
          type: "data_gap",
          description: q3Result.refusal.reason,
          severity: "high",
        },
      ],
      confidence: "low",
      refusal: {
        reason: "Cannot assess capacity without viable candidates",
        details: [q3Result.refusal.reason, ...q3Result.refusal.details],
      },
    };
  }

  // If no viable candidates, refuse
  if (q3Result.viableCandidates.length === 0) {
    return {
      feasibility: "insufficient_data",
      assumptions: [],
      capacitySummary: {
        totalEffectiveCapacity: 0,
        contributorCount: 0,
        concentrationRisk: "high",
        fragmentationLevel: "low",
        timeDistribution: "even",
        qualitativeDescription: "No capacity data available",
      },
      risks: [
        {
          type: "data_gap",
          description: "No viable candidates with non-zero capacity",
          severity: "high",
        },
      ],
      confidence: "low",
      refusal: {
        reason: "No viable candidates exist",
        details: ["All candidates have zero effective capacity or are unavailable."],
      },
    };
  }

  // Step 2: Translate timeframe into capacity window
  const capacityWindows = await computeCapacityWindows(
    q3Result.viableCandidates.map((c) => c.personId),
    workspaceId,
    startDate,
    endDate
  );

  // Step 3: Aggregate capacity signal
  const capacitySummary = aggregateCapacitySignal(
    q3Result.viableCandidates,
    capacityWindows,
    startDate,
    endDate
  );

  // Step 4: Identify risk factors
  const risks = identifyRiskFactors(
    q3Result,
    capacityWindows,
    capacitySummary,
    startDate,
    endDate
  );

  // Step 5: Determine feasibility classification
  const feasibility = determineFeasibility(
    capacitySummary,
    risks,
    q3Result.constraints,
    q3Result.confidence
  );

  // Collect assumptions
  const assumptions = collectAssumptions(
    validatedTimeframe,
    q3Result,
    capacityWindows
  );

  // Determine confidence
  const confidence = determineConfidence(
    feasibility,
    risks,
    q3Result.confidence,
    capacitySummary
  );

  return {
    feasibility,
    assumptions,
    capacitySummary,
    risks,
    confidence,
  };
}

// ============================================================================
// Step 0: Validate Timeframe
// ============================================================================

function validateTimeframe(
  timeframe: Q4Timeframe | { startDate?: Date; endDate?: Date; durationWeeks?: number }
): Q4Timeframe | null {
  const now = new Date();

  // Must have at least startDate
  if (!timeframe.startDate) {
    return null;
  }

  const startDate = timeframe.startDate instanceof Date
    ? timeframe.startDate
    : new Date(timeframe.startDate);

  // Determine endDate
  let endDate: Date;
  if (timeframe.endDate) {
    endDate = timeframe.endDate instanceof Date
      ? timeframe.endDate
      : new Date(timeframe.endDate);
  } else if (timeframe.durationWeeks) {
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + timeframe.durationWeeks * 7);
  } else {
    return null; // Must have either endDate or durationWeeks
  }

  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return null;
  }

  // End must be after start
  if (endDate <= startDate) {
    return null;
  }

  // Start should not be in the past (allow small tolerance)
  if (startDate < new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
    // Allow 1 day in the past
    return null;
  }

  return { startDate, endDate };
}

// ============================================================================
// Step 2: Translate Timeframe into Capacity Window
// ============================================================================

type CapacityWindow = {
  personId: string;
  windows: Array<{
    startDate: Date;
    endDate: Date;
    effectiveCapacity: number; // 0..1
  }>;
};

async function computeCapacityWindows(
  personIds: string[],
  workspaceId: string,
  startDate: Date,
  endDate: Date
): Promise<Map<string, CapacityWindow>> {
  const orgId = workspaceId;

  // Fetch people with availability and allocations
  const users = await prisma.user.findMany({
    where: {
      id: { in: personIds },
    },
    include: {
      availability: {
        where: {
          OR: [
            {
              startDate: { lte: endDate },
              endDate: { gte: startDate },
            },
            {
              startDate: { lte: endDate },
              endDate: null,
            },
          ],
        },
        select: {
          type: true,
          startDate: true,
          endDate: true,
          fraction: true,
        },
      },
      allocations: {
        where: {
          orgId,
          OR: [
            {
              startDate: { lte: endDate },
              endDate: { gte: startDate },
            },
            {
              startDate: { lte: endDate },
              endDate: null,
            },
          ],
        },
        select: {
          projectId: true,
          fraction: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  });

  const capacityWindows = new Map<string, CapacityWindow>();

  for (const user of users) {
    // Convert availability to windows
    const availabilityWindows = user.availability.map((a) => ({
      type: a.type === "UNAVAILABLE" ? ("unavailable" as const) : ("partial" as const),
      startDate: a.startDate,
      endDate: a.endDate ?? undefined,
      fraction: a.fraction ?? undefined,
    }));

    // Get allocations
    const allocations = user.allocations.map((a) => ({
      projectId: a.projectId,
      fraction: a.fraction,
      startDate: a.startDate,
      endDate: a.endDate ?? undefined,
    }));

    // Compute capacity windows by intersecting availability, allocations, and timeframe
    const windows = computeIntersectedWindows(
      availabilityWindows,
      allocations,
      startDate,
      endDate
    );

    capacityWindows.set(user.id, {
      personId: user.id,
      windows,
    });
  }

  return capacityWindows;
}

function computeIntersectedWindows(
  availabilityWindows: Array<{
    type: "unavailable" | "partial";
    startDate: Date;
    endDate?: Date;
    fraction?: number;
  }>,
  allocations: Array<{
    projectId: string;
    fraction: number;
    startDate: Date;
    endDate?: Date;
  }>,
  timeframeStart: Date,
  timeframeEnd: Date
): Array<{ startDate: Date; endDate: Date; effectiveCapacity: number }> {
  // For simplicity, compute average effective capacity over the timeframe
  // In a more sophisticated implementation, you'd break it into segments

  // Check if person is unavailable during any part of timeframe
  const hasUnavailable = availabilityWindows.some(
    (a) =>
      a.type === "unavailable" &&
      a.startDate <= timeframeEnd &&
      (!a.endDate || a.endDate >= timeframeStart)
  );

  if (hasUnavailable) {
    // Check if unavailable covers entire timeframe
    const unavailableCoversAll = availabilityWindows.some(
      (a) =>
        a.type === "unavailable" &&
        a.startDate <= timeframeStart &&
        (!a.endDate || a.endDate >= timeframeEnd)
    );

    if (unavailableCoversAll) {
      return [
        {
          startDate: timeframeStart,
          endDate: timeframeEnd,
          effectiveCapacity: 0,
        },
      ];
    }
  }

  // Compute base availability
  let baseCapacity = 1.0;
  const partialWindows = availabilityWindows.filter((a) => a.type === "partial");
  if (partialWindows.length > 0) {
    // Use the most restrictive partial availability
    baseCapacity = Math.min(
      ...partialWindows.map((a) => a.fraction ?? 0.5)
    );
  }

  // Compute allocated capacity during timeframe
  const activeAllocations = allocations.filter(
    (a) =>
      a.startDate <= timeframeEnd &&
      (!a.endDate || a.endDate >= timeframeStart)
  );

  const allocatedFraction = activeAllocations.reduce(
    (sum, a) => sum + a.fraction,
    0
  );

  const effectiveCapacity = Math.max(0, baseCapacity - allocatedFraction);

  return [
    {
      startDate: timeframeStart,
      endDate: timeframeEnd,
      effectiveCapacity,
    },
  ];
}

// ============================================================================
// Step 3: Aggregate Capacity Signal
// ============================================================================

function aggregateCapacitySignal(
  candidates: Q3Output["viableCandidates"],
  capacityWindows: Map<string, CapacityWindow>,
  startDate: Date,
  endDate: Date
): Q4CapacitySummary {
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationWeeks = durationMs / (7 * 24 * 60 * 60 * 1000);

  let totalEffectiveCapacity = 0;
  const contributorCapacities: number[] = [];

  for (const candidate of candidates) {
    const window = capacityWindows.get(candidate.personId);
    if (!window || window.windows.length === 0) {
      continue;
    }

    // Sum capacity across all windows, weighted by duration
    let personCapacity = 0;
    for (const w of window.windows) {
      const windowDuration = Math.min(
        w.endDate.getTime(),
        endDate.getTime()
      ) - Math.max(w.startDate.getTime(), startDate.getTime());
      const windowWeight = windowDuration / durationMs;
      personCapacity += w.effectiveCapacity * windowWeight;
    }

    totalEffectiveCapacity += personCapacity;
    contributorCapacities.push(personCapacity);
  }

  // Determine concentration risk
  const maxCapacity = Math.max(...contributorCapacities, 0);
  const concentrationRisk =
    maxCapacity > totalEffectiveCapacity * 0.6
      ? "high"
      : maxCapacity > totalEffectiveCapacity * 0.4
      ? "medium"
      : "low";

  // Determine fragmentation
  const nonZeroContributors = contributorCapacities.filter((c) => c > 0).length;
  const fragmentationLevel =
    nonZeroContributors >= 4
      ? "high"
      : nonZeroContributors >= 2
      ? "medium"
      : "low";

  // Time distribution (simplified - would need more granular analysis)
  const timeDistribution = "even"; // Placeholder

  // Generate qualitative description
  const qualitativeDescription = generateQualitativeCapacityDescription(
    totalEffectiveCapacity,
    nonZeroContributors,
    fragmentationLevel,
    concentrationRisk
  );

  return {
    totalEffectiveCapacity,
    contributorCount: nonZeroContributors,
    concentrationRisk,
    fragmentationLevel,
    timeDistribution,
    qualitativeDescription,
  };
}

// ============================================================================
// Step 4: Identify Risk Factors
// ============================================================================

function identifyRiskFactors(
  q3Result: Q3Output,
  capacityWindows: Map<string, CapacityWindow>,
  capacitySummary: Q4CapacitySummary,
  startDate: Date,
  endDate: Date
): Q4Risk[] {
  const risks: Q4Risk[] = [];

  // Single point dependency
  if (capacitySummary.contributorCount === 1) {
    risks.push({
      type: "single_point_dependency",
      description: "Capacity relies on a single person",
      severity: "high",
    });
  } else if (capacitySummary.contributorCount === 2) {
    risks.push({
      type: "concentration_risk",
      description: "Capacity concentrated in 2 people",
      severity: "medium",
    });
  }

  // Concentration risk
  if (capacitySummary.concentrationRisk === "high") {
    risks.push({
      type: "concentration_risk",
      description: "Heavy reliance on one contributor",
      severity: "high",
    });
  }

  // Partial availability
  const partialAvailabilityCount = q3Result.viableCandidates.filter(
    (c) => c.capacityStatus.includes("limited") || c.capacityStatus.includes("very limited")
  ).length;
  if (partialAvailabilityCount > 0) {
    risks.push({
      type: "partial_availability",
      description: `${partialAvailabilityCount} contributor(s) have partial availability`,
      severity: partialAvailabilityCount === capacitySummary.contributorCount ? "high" : "medium",
    });
  }

  // Overallocation
  const overallocatedCount = q3Result.viableCandidates.filter(
    (c) => c.isOverallocated
  ).length;
  if (overallocatedCount > 0) {
    risks.push({
      type: "overallocation",
      description: `${overallocatedCount} contributor(s) are already overallocated`,
      severity: "high",
    });
  }

  // Role misalignment
  const misalignedCount = q3Result.viableCandidates.filter(
    (c) => c.roleAlignment === "potentially_misaligned"
  ).length;
  if (misalignedCount > 0) {
    risks.push({
      type: "role_misalignment",
      description: `${misalignedCount} contributor(s) may have role misalignment`,
      severity: "medium",
    });
  }

  // Ownership unclear
  if (q3Result.constraints.some((c) => c.type === "ownership_missing")) {
    risks.push({
      type: "ownership_unclear",
      description: "Project ownership is not defined",
      severity: "medium",
    });
  }

  // Tight margins
  if (capacitySummary.totalEffectiveCapacity < 0.5) {
    risks.push({
      type: "tight_margins",
      description: "Total capacity is less than half-time equivalent",
      severity: "high",
    });
  }

  // Data gaps
  if (q3Result.confidence === "low") {
    risks.push({
      type: "data_gap",
      description: "Insufficient Org data for reliable assessment",
      severity: "medium",
    });
  }

  return risks;
}

// ============================================================================
// Step 5: Determine Feasibility Classification
// ============================================================================

function determineFeasibility(
  capacitySummary: Q4CapacitySummary,
  risks: Q4Risk[],
  constraints: Q3Output["constraints"],
  q3Confidence: Q3Output["confidence"]
): Q4Feasibility {
  // Insufficient data check
  if (
    q3Confidence === "low" ||
    constraints.some((c) => c.type === "ownership_missing") ||
    capacitySummary.contributorCount === 0
  ) {
    return "insufficient_data";
  }

  // Count high-severity risks
  const highRiskCount = risks.filter((r) => r.severity === "high").length;
  const mediumRiskCount = risks.filter((r) => r.severity === "medium").length;

  // Capacity thresholds (qualitative)
  const hasComfortableCapacity = capacitySummary.totalEffectiveCapacity >= 0.8;
  const hasMinimalCapacity = capacitySummary.totalEffectiveCapacity >= 0.3;

  // Unlikely feasible
  if (
    !hasMinimalCapacity ||
    highRiskCount >= 3 ||
    (highRiskCount >= 2 && capacitySummary.totalEffectiveCapacity < 0.5)
  ) {
    return "unlikely_feasible";
  }

  // Likely feasible
  if (
    hasComfortableCapacity &&
    highRiskCount === 0 &&
    mediumRiskCount <= 1 &&
    capacitySummary.contributorCount >= 2
  ) {
    return "likely_feasible";
  }

  // Possibly feasible (default for middle cases)
  return "possibly_feasible";
}

// ============================================================================
// Helper Functions
// ============================================================================

function collectAssumptions(
  timeframe: Q4Timeframe,
  q3Result: Q3Output,
  capacityWindows: Map<string, CapacityWindow>
): Q4Assumption[] {
  const assumptions: Q4Assumption[] = [];

  assumptions.push({
    type: "timeframe",
    description: `Timeframe: ${timeframe.startDate.toISOString().split("T")[0]} to ${timeframe.endDate.toISOString().split("T")[0]}`,
  });

  assumptions.push({
    type: "availability",
    description: `Assuming ${q3Result.viableCandidates.length} candidate(s) remain available as modeled`,
  });

  assumptions.push({
    type: "allocation",
    description: "Assuming existing allocations remain stable",
  });

  if (q3Result.constraints.some((c) => c.type === "ownership_missing")) {
    assumptions.push({
      type: "ownership",
      description: "Project ownership is not defined",
    });
  }

  return assumptions;
}

function generateQualitativeCapacityDescription(
  totalEffectiveCapacity: number,
  contributorCount: number,
  fragmentationLevel: Q4CapacitySummary["fragmentationLevel"],
  concentrationRisk: Q4CapacitySummary["concentrationRisk"]
): string {
  // Convert numeric capacity to qualitative terms
  let capacityLevel: string;
  if (totalEffectiveCapacity >= 0.8) {
    capacityLevel = "roughly one full-time equivalent";
  } else if (totalEffectiveCapacity >= 0.5) {
    capacityLevel = "roughly half-time to three-quarters equivalent";
  } else if (totalEffectiveCapacity >= 0.3) {
    capacityLevel = "roughly one-third to half-time equivalent";
  } else if (totalEffectiveCapacity > 0) {
    capacityLevel = "very limited capacity";
  } else {
    capacityLevel = "no effective capacity";
  }

  // Describe fragmentation
  let fragmentationDesc: string;
  if (fragmentationLevel === "high") {
    fragmentationDesc = `fragmented across ${contributorCount} people`;
  } else if (fragmentationLevel === "medium") {
    fragmentationDesc = `split between ${contributorCount} people`;
  } else {
    fragmentationDesc = `concentrated in ${contributorCount} person${contributorCount > 1 ? "s" : ""}`;
  }

  // Combine
  if (totalEffectiveCapacity === 0) {
    return "No effective capacity available";
  }

  return `Capacity ${capacityLevel}, ${fragmentationDesc}`;
}

function determineConfidence(
  feasibility: Q4Feasibility,
  risks: Q4Risk[],
  q3Confidence: Q3Output["confidence"],
  capacitySummary: Q4CapacitySummary
): Q4Confidence {
  if (feasibility === "insufficient_data") {
    return "low";
  }

  if (q3Confidence === "low") {
    return "low";
  }

  const highRiskCount = risks.filter((r) => r.severity === "high").length;
  if (highRiskCount >= 2) {
    return "low";
  }

  if (capacitySummary.totalEffectiveCapacity < 0.5) {
    return "low";
  }

  if (q3Confidence === "high" && highRiskCount === 0) {
    return "high";
  }

  return "medium";
}

