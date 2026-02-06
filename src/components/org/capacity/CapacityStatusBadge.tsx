"use client";

/**
 * CapacityStatusBadge
 *
 * Displays capacity status as a color-coded badge.
 * Uses the canonical STATUS_UI_MAP from status.ts.
 *
 * Invariant: This component never computes status — it only displays it.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type CapacityStatus =
  | "MISSING"
  | "OK"
  | "OVERLOADED"
  | "SEVERELY_OVERLOADED"
  | "UNDERUTILIZED"
  | "ZERO_AVAILABLE"
  | "MISSING_DATA"
  | "NO_CAPACITY";

const STATUS_CONFIG: Record<CapacityStatus, { label: string; className: string }> = {
  SEVERELY_OVERLOADED: {
    label: "Severely Overloaded",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  },
  OVERLOADED: {
    label: "Overloaded",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  },
  ZERO_AVAILABLE: {
    label: "Zero Availability",
    className: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-800",
  },
  NO_CAPACITY: {
    label: "No Capacity",
    className: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-800",
  },
  UNDERUTILIZED: {
    label: "Underutilized",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  },
  MISSING: {
    label: "No Data",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  },
  MISSING_DATA: {
    label: "Missing Data",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  },
  OK: {
    label: "OK",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  },
};

type Props = {
  status: CapacityStatus;
  /** Optional utilization percentage to display (e.g. "120%") */
  utilizationPct?: number;
  /** Compact mode for tight spaces */
  compact?: boolean;
  className?: string;
};

export function CapacityStatusBadge({ status, utilizationPct, compact, className }: Props) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  const label = compact
    ? config.label
    : utilizationPct !== undefined && status !== "MISSING" && status !== "MISSING_DATA"
      ? `${Math.round(utilizationPct)}% ${config.label}`
      : config.label;

  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", config.className, className)}
    >
      {label}
    </Badge>
  );
}

/**
 * Small dot indicator for team pills in Structure view.
 */
export function CapacityStatusDot({ status, className }: { status: CapacityStatus; className?: string }) {
  const colorMap: Record<CapacityStatus, string> = {
    SEVERELY_OVERLOADED: "bg-red-500",
    OVERLOADED: "bg-orange-500",
    ZERO_AVAILABLE: "bg-red-400",
    NO_CAPACITY: "bg-red-400",
    UNDERUTILIZED: "bg-yellow-500",
    MISSING: "bg-gray-400",
    MISSING_DATA: "bg-gray-400",
    OK: "bg-green-500",
  };

  return (
    <span
      className={cn("inline-block h-2 w-2 rounded-full", colorMap[status] ?? "bg-gray-400", className)}
      title={STATUS_CONFIG[status]?.label ?? status}
    />
  );
}
