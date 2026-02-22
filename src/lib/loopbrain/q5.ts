/**
 * Loopbrain Q5: "Who is unavailable, and when do they return?"
 * 
 * Person-scoped question that reads PersonAvailability windows.
 */

import type { Q5Response } from "./types";
import { deriveCurrentAvailability } from "@/lib/org";

export async function answerQ5(args: {
  person: { id: string; name?: string | null };
  availability: Array<{
    type: "UNAVAILABLE" | "PARTIAL";
    startDate: Date;
    endDate?: Date | null;
    fraction?: number | null;
    note?: string | null;
  }>;
  at?: Date;
}): Promise<Q5Response> {
  const at = args.at ?? new Date();

  const windows = args.availability.map((w) => ({
    type: w.type === "UNAVAILABLE" ? ("unavailable" as const) : ("partial" as const),
    startDate: new Date(w.startDate),
    endDate: w.endDate ? new Date(w.endDate) : undefined,
    fraction: w.fraction ?? undefined,
    note: w.note ?? undefined,
  }));

  const current = deriveCurrentAvailability(windows, at);

  let returnDate: string | undefined = undefined;
  if (current.status === "unavailable") {
    const activeUnavailable = windows
      .filter((w) => w.type === "unavailable")
      .filter((w) => w.startDate <= at && (!w.endDate || w.endDate >= at))
      .sort((a, b) => (a.endDate?.getTime() ?? Infinity) - (b.endDate?.getTime() ?? Infinity))[0];

    if (activeUnavailable?.endDate) {
      returnDate = activeUnavailable.endDate.toISOString();
    }
  }

  const confidence: "high" | "medium" | "low" =
    args.availability.length === 0 ? "low" : "high";

  const constraints: string[] = [];
  if (args.availability.length === 0) {
    constraints.push("No availability windows recorded in Org");
  }

  return {
    questionId: "Q5",
    assumptions: [`Assessment as-of ${at.toISOString()}`],
    constraints,
    risks: [],
    confidence,
    personId: args.person.id,
    name: args.person.name || undefined,
    currentStatus: current.status,
    returnDate,
    activeWindows: windows
      .filter((w) => w.startDate <= at && (!w.endDate || w.endDate >= at))
      .map((w) => ({
        type: w.type,
        start: w.startDate.toISOString(),
        end: w.endDate?.toISOString(),
        fraction: w.fraction,
        note: w.note,
      })),
  };
}

