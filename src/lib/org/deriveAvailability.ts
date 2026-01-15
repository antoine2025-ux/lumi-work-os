/**
 * Availability Derivation
 * 
 * Derives current availability state from availability windows.
 * 
 * Phase 2 Extensions:
 * - Structured availability reasons
 * - Expected return date tracking
 * - Employment status integration
 */

// Availability reason enum (matches Prisma schema)
export type AvailabilityReason =
  | "VACATION"
  | "SICK_LEAVE"
  | "PARENTAL_LEAVE"
  | "SABBATICAL"
  | "JURY_DUTY"
  | "BEREAVEMENT"
  | "TRAINING"
  | "OTHER";

// Employment status enum (matches Prisma schema)
export type EmploymentStatus =
  | "ACTIVE"
  | "ON_LEAVE"
  | "TERMINATED"
  | "CONTRACTOR";

// Extended availability window with Phase 2 fields
export type AvailabilityWindow = {
  type: "unavailable" | "partial";
  startDate: Date;
  endDate?: Date;
  fraction?: number;
  // Phase 2: Reason and return tracking
  reason?: AvailabilityReason;
  expectedReturnDate?: Date;
  note?: string;
};

// Availability status types
export type AvailabilityStatus = "available" | "partial" | "unavailable";

// Extended availability result with Phase 2 metadata
export type AvailabilityResult = {
  status: AvailabilityStatus;
  fraction?: number;
  // Phase 2: Extended fields
  reason?: AvailabilityReason;
  expectedReturnDate?: Date;
  note?: string;
  // Active windows for context
  activeWindows?: AvailabilityWindow[];
};

/**
 * Derive current availability from windows
 * 
 * @param windows - Array of availability windows
 * @param at - Point in time to check (defaults to now)
 * @returns Availability result with status and metadata
 */
export function deriveCurrentAvailability(
  windows: AvailabilityWindow[],
  at: Date = new Date()
): AvailabilityResult {
  const active = windows.filter(
    (w) => w.startDate <= at && (!w.endDate || w.endDate >= at)
  );

  // If any window marks as unavailable, person is unavailable
  const unavailableWindow = active.find((w) => w.type === "unavailable");
  if (unavailableWindow) {
    return {
      status: "unavailable",
      reason: unavailableWindow.reason,
      expectedReturnDate: unavailableWindow.expectedReturnDate ?? unavailableWindow.endDate,
      note: unavailableWindow.note,
      activeWindows: active,
    };
  }

  // Check for partial availability
  const partialWindow = active.find((w) => w.type === "partial");
  if (partialWindow) {
    return {
      status: "partial",
      fraction: partialWindow.fraction ?? 0.5,
      reason: partialWindow.reason,
      expectedReturnDate: partialWindow.expectedReturnDate ?? partialWindow.endDate,
      note: partialWindow.note,
      activeWindows: active,
    };
  }

  return { status: "available", activeWindows: [] };
}

// Person availability input type with employment status
export type PersonAvailabilityInput = {
  personId: string;
  employmentStatus?: EmploymentStatus;
  windows: AvailabilityWindow[];
};

// Full person availability result
export type PersonAvailabilityResult = {
  personId: string;
  employmentStatus: EmploymentStatus;
  availability: AvailabilityResult;
  isWorking: boolean; // Computed: ACTIVE and available
  effectiveCapacity: number; // 0-1 scale
};

/**
 * Derive full availability for a person including employment status
 * 
 * @param input - Person availability input
 * @param at - Point in time to check
 * @returns Full availability result
 */
export function derivePersonAvailability(
  input: PersonAvailabilityInput,
  at: Date = new Date()
): PersonAvailabilityResult {
  const employmentStatus = input.employmentStatus ?? "ACTIVE";
  const availability = deriveCurrentAvailability(input.windows, at);

  // Compute if person is actively working
  const isEmployed = employmentStatus === "ACTIVE" || employmentStatus === "CONTRACTOR";
  const isAvailable = availability.status === "available" || availability.status === "partial";
  const isWorking = isEmployed && isAvailable;

  // Compute effective capacity (0-1)
  let effectiveCapacity = 0;
  if (isEmployed) {
    if (availability.status === "available") {
      effectiveCapacity = 1.0;
    } else if (availability.status === "partial") {
      effectiveCapacity = availability.fraction ?? 0.5;
    }
    // unavailable = 0
  }

  return {
    personId: input.personId,
    employmentStatus,
    availability,
    isWorking,
    effectiveCapacity,
  };
}

/**
 * Get the next expected return date from active windows
 */
export function getNextReturnDate(windows: AvailabilityWindow[]): Date | null {
  const now = new Date();
  const active = windows.filter(
    (w) => w.startDate <= now && (!w.endDate || w.endDate >= now)
  );

  if (active.length === 0) return null;

  // Find the earliest end date among active windows
  const returnDates = active
    .map((w) => w.expectedReturnDate ?? w.endDate)
    .filter((d): d is Date => d !== undefined)
    .sort((a, b) => a.getTime() - b.getTime());

  return returnDates.length > 0 ? returnDates[0] : null;
}

/**
 * Check if availability data is stale
 * 
 * @param lastUpdated - Last update timestamp
 * @param staleDays - Number of days after which data is considered stale
 * @returns True if data is stale
 */
export function isAvailabilityStale(
  lastUpdated: Date,
  staleDays: number = 14
): boolean {
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - staleDays * 24 * 60 * 60 * 1000);
  return lastUpdated < staleThreshold;
}

/**
 * Format availability for display
 */
export function formatAvailabilityStatus(result: AvailabilityResult): string {
  switch (result.status) {
    case "available":
      return "Available";
    case "partial":
      return `Partial (${Math.round((result.fraction ?? 0.5) * 100)}%)`;
    case "unavailable":
      if (result.reason) {
        return `Unavailable - ${formatReason(result.reason)}`;
      }
      return "Unavailable";
    default:
      return "Unknown";
  }
}

/**
 * Format availability reason for display
 */
export function formatReason(reason: AvailabilityReason): string {
  const reasonLabels: Record<AvailabilityReason, string> = {
    VACATION: "Vacation",
    SICK_LEAVE: "Sick Leave",
    PARENTAL_LEAVE: "Parental Leave",
    SABBATICAL: "Sabbatical",
    JURY_DUTY: "Jury Duty",
    BEREAVEMENT: "Bereavement",
    TRAINING: "Training",
    OTHER: "Other",
  };
  return reasonLabels[reason] || reason;
}

/**
 * Format expected return date
 */
export function formatExpectedReturn(date: Date | undefined): string | null {
  if (!date) return null;
  
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return "Overdue";
  } else if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Tomorrow";
  } else if (diffDays <= 7) {
    return `In ${diffDays} days`;
  } else if (diffDays <= 30) {
    const weeks = Math.round(diffDays / 7);
    return `In ${weeks} week${weeks > 1 ? "s" : ""}`;
  } else {
    return date.toLocaleDateString();
  }
}
