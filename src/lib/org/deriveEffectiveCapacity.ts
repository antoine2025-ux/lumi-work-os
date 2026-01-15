import { sumAllocationFraction } from "./deriveAllocations";

export function deriveEffectiveCapacity(args: {
  availabilityStatus: "available" | "partial" | "unavailable";
  partialFraction?: number; // 0..1 when partial
  allocations: { fraction: number; startDate: Date; endDate?: Date }[];
  at?: Date;
}) {
  const at = args.at ?? new Date();

  if (args.availabilityStatus === "unavailable") {
    return { effectiveFraction: 0, reason: "Unavailable" };
  }

  const base =
    args.availabilityStatus === "partial"
      ? Math.max(0, Math.min(1, args.partialFraction ?? 0.5))
      : 1;

  const allocated = sumAllocationFraction(args.allocations as any, at);
  const effective = Math.max(0, base - allocated);

  return {
    effectiveFraction: Number(effective.toFixed(2)),
    reason:
      args.availabilityStatus === "partial"
        ? "Partial availability minus allocations"
        : "Allocations deducted from full capacity",
  };
}

