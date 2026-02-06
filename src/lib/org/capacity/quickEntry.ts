/**
 * Capacity Quick-Entry Module
 *
 * This is the ONLY module allowed to translate simplified UX inputs into
 * CapacityContract / WorkAllocation / PersonAvailability writes.
 *
 * Destructive Write Guardrails:
 * - Only creates or updates open-ended records (effectiveTo/endDate === null).
 * - Never closes, deletes, or modifies historical records.
 * - If an overlapping open-ended record exists, updates the most recent one.
 * - If no open-ended record exists, creates a new one with effectiveFrom = now.
 * - All writes are wrapped in a Prisma transaction.
 *
 * Single-Allocation Invariant:
 * - One active "baseline" allocation per person:
 *   contextType === "ROLE", contextLabel === "Baseline allocation", endDate === null
 * - Quick-entry does not affect other allocations.
 *
 * Default when allocationPct is omitted:
 * - Baseline allocation defaults to 1.0 (100% of available hours).
 */

import { prisma } from "@/lib/db";
import { resolveEffectiveCapacity, type EffectiveCapacity } from "./resolveEffectiveCapacity";
import { getDefaultIssueWindow, getWorkspaceThresholdsAsync } from "./thresholds";
import { getPersonCapacityStatus, type PersonCapacityMeta, type PersonCapacityStatus } from "./status";

// ============================================================================
// Types
// ============================================================================

export type QuickEntryInput = {
  /** Weekly capacity hours (e.g. 40, 32, 20). Maps to CapacityContract. */
  weeklyHours?: number;
  /** Availability percentage 0-100. Maps to PersonAvailability. */
  availabilityPct?: number;
  /** Allocation percentage 0-200. Maps to WorkAllocation. Defaults to 100 if omitted on first entry. */
  allocationPct?: number;
};

export type QuickEntryResult = {
  personId: string;
  capacity: EffectiveCapacity;
  status: PersonCapacityStatus;
  meta: PersonCapacityMeta;
  /** Which records were created or updated */
  mutations: {
    contract: "created" | "updated" | "skipped";
    allocation: "created" | "updated" | "skipped";
    availability: "created" | "updated" | "skipped";
  };
};

const BASELINE_CONTEXT_TYPE = "ROLE" as const;
const BASELINE_CONTEXT_LABEL = "Baseline allocation";

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Apply quick-entry capacity inputs for a person.
 * Translates simplified UX fields into CapacityContract + WorkAllocation + PersonAvailability writes.
 *
 * @param workspaceId - Workspace ID (from auth, not params)
 * @param personId - User ID
 * @param input - Simplified capacity inputs
 * @param createdById - User ID of the person making the change
 */
export async function applyQuickEntry(
  workspaceId: string,
  personId: string,
  input: QuickEntryInput,
  createdById: string
): Promise<QuickEntryResult> {
  const now = new Date();
  const mutations = {
    contract: "skipped" as "created" | "updated" | "skipped",
    allocation: "skipped" as "created" | "updated" | "skipped",
    availability: "skipped" as "created" | "updated" | "skipped",
  };

  await prisma.$transaction(async (tx) => {
    // 1. Weekly hours → CapacityContract
    if (input.weeklyHours !== undefined) {
      const existingContract = await tx.capacityContract.findFirst({
        where: {
          workspaceId,
          personId,
          effectiveTo: null, // open-ended only
        },
        orderBy: { effectiveFrom: "desc" },
      });

      if (existingContract) {
        await tx.capacityContract.update({
          where: { id: existingContract.id },
          data: { weeklyCapacityHours: input.weeklyHours },
        });
        mutations.contract = "updated";
      } else {
        await tx.capacityContract.create({
          data: {
            workspaceId,
            personId,
            weeklyCapacityHours: input.weeklyHours,
            effectiveFrom: now,
            effectiveTo: null,
            createdById,
          },
        });
        mutations.contract = "created";
      }
    }

    // 2. Allocation % → WorkAllocation (baseline only)
    if (input.allocationPct !== undefined) {
      const allocationDecimal = input.allocationPct / 100;

      const existingAllocation = await tx.workAllocation.findFirst({
        where: {
          workspaceId,
          personId,
          contextType: BASELINE_CONTEXT_TYPE,
          contextLabel: BASELINE_CONTEXT_LABEL,
          endDate: null, // open-ended only
        },
        orderBy: { startDate: "desc" },
      });

      if (existingAllocation) {
        await tx.workAllocation.update({
          where: { id: existingAllocation.id },
          data: { allocationPercent: allocationDecimal },
        });
        mutations.allocation = "updated";
      } else {
        await tx.workAllocation.create({
          data: {
            workspaceId,
            personId,
            allocationPercent: allocationDecimal,
            contextType: BASELINE_CONTEXT_TYPE,
            contextLabel: BASELINE_CONTEXT_LABEL,
            startDate: now,
            endDate: null,
            source: "MANUAL",
            createdById,
          },
        });
        mutations.allocation = "created";
      }
    }
    // Default: if creating a contract but no allocation specified, ensure baseline exists at 100%
    else if (input.weeklyHours !== undefined) {
      const existingAllocation = await tx.workAllocation.findFirst({
        where: {
          workspaceId,
          personId,
          contextType: BASELINE_CONTEXT_TYPE,
          contextLabel: BASELINE_CONTEXT_LABEL,
          endDate: null,
        },
      });

      if (!existingAllocation) {
        await tx.workAllocation.create({
          data: {
            workspaceId,
            personId,
            allocationPercent: 1.0, // 100% default
            contextType: BASELINE_CONTEXT_TYPE,
            contextLabel: BASELINE_CONTEXT_LABEL,
            startDate: now,
            endDate: null,
            source: "MANUAL",
            createdById,
          },
        });
        mutations.allocation = "created";
      }
    }

    // 3. Availability % → PersonAvailability
    if (input.availabilityPct !== undefined) {
      const fraction = input.availabilityPct / 100;
      const availType = fraction === 0
        ? "UNAVAILABLE" as const
        : fraction < 1
          ? "PARTIAL" as const
          : "AVAILABLE" as const;

      const existingAvailability = await tx.personAvailability.findFirst({
        where: {
          workspaceId,
          personId,
          endDate: null, // open-ended only
          source: "MANUAL",
        },
        orderBy: { startDate: "desc" },
      });

      if (existingAvailability) {
        await tx.personAvailability.update({
          where: { id: existingAvailability.id },
          data: {
            type: availType,
            fraction,
          },
        });
        mutations.availability = "updated";
      } else {
        await tx.personAvailability.create({
          data: {
            workspaceId,
            personId,
            type: availType,
            startDate: now,
            endDate: null,
            fraction,
            source: "MANUAL",
            createdById,
          },
        });
        mutations.availability = "created";
      }
    }
  });

  // Re-resolve capacity after writes
  const issueWindow = getDefaultIssueWindow();
  const capacity = await resolveEffectiveCapacity(
    workspaceId,
    personId,
    { start: issueWindow.start, end: issueWindow.end }
  );

  // Check data presence for meta
  const [contractCount, availCount] = await Promise.all([
    prisma.capacityContract.count({
      where: {
        workspaceId,
        personId,
        effectiveFrom: { lte: issueWindow.start },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: issueWindow.start } },
        ],
      },
    }),
    prisma.personAvailability.count({
      where: {
        workspaceId,
        personId,
        startDate: { lte: issueWindow.end },
        OR: [
          { endDate: null },
          { endDate: { gte: issueWindow.start } },
        ],
      },
    }),
  ]);

  const meta: PersonCapacityMeta = {
    isContractDefault: contractCount === 0,
    hasAvailabilityData: availCount > 0,
  };

  const settings = await getWorkspaceThresholdsAsync(workspaceId);
  const status = getPersonCapacityStatus(capacity, meta, settings);

  return {
    personId,
    capacity,
    status,
    meta,
    mutations,
  };
}

/**
 * Get current quick-entry values for a person (read-only).
 * Returns the values that would pre-fill the quick-entry form.
 */
export async function getQuickEntryValues(
  workspaceId: string,
  personId: string
): Promise<{
  weeklyHours: number | null;
  availabilityPct: number | null;
  allocationPct: number | null;
  isDefault: boolean;
}> {
  const [contract, allocation, availability] = await Promise.all([
    prisma.capacityContract.findFirst({
      where: { workspaceId, personId, effectiveTo: null },
      orderBy: { effectiveFrom: "desc" },
      select: { weeklyCapacityHours: true },
    }),
    prisma.workAllocation.findFirst({
      where: {
        workspaceId,
        personId,
        contextType: BASELINE_CONTEXT_TYPE,
        contextLabel: BASELINE_CONTEXT_LABEL,
        endDate: null,
      },
      orderBy: { startDate: "desc" },
      select: { allocationPercent: true },
    }),
    prisma.personAvailability.findFirst({
      where: { workspaceId, personId, endDate: null, source: "MANUAL" },
      orderBy: { startDate: "desc" },
      select: { fraction: true },
    }),
  ]);

  return {
    weeklyHours: contract?.weeklyCapacityHours ?? null,
    availabilityPct: availability?.fraction != null ? Math.round(availability.fraction * 100) : null,
    allocationPct: allocation?.allocationPercent != null ? Math.round(allocation.allocationPercent * 100) : null,
    isDefault: !contract && !availability,
  };
}
