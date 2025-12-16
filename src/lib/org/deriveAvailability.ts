export type AvailabilityWindow = {
  type: "unavailable" | "partial";
  startDate: Date;
  endDate?: Date;
  fraction?: number;
};

export function deriveCurrentAvailability(
  windows: AvailabilityWindow[],
  at: Date = new Date()
) {
  const active = windows.filter(
    (w) => w.startDate <= at && (!w.endDate || w.endDate >= at)
  );

  if (active.some((w) => w.type === "unavailable")) {
    return { status: "unavailable" as const };
  }

  const partial = active.find((w) => w.type === "partial");
  if (partial) {
    return {
      status: "partial" as const,
      fraction: partial.fraction ?? 0.5,
    };
  }

  return { status: "available" as const };
}

