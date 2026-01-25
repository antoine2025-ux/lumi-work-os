/**
 * Allocations Module
 * 
 * Phase G: Work allocation queries and computation.
 */

export {
  getWorkAllocations,
  getWorkAllocationsBatch,
  computeAllocationSummary,
  computeAllocationSummaryForWindow,
  computeAllocatedHoursForWindow,
  computeTotalAllocatedHoursForWindow,
  computeAllocationSummaryBatch,
  type WorkAllocation,
  type AllocationSummary,
} from "./read";
