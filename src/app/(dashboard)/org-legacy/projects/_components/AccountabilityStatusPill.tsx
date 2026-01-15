"use client";

import React from "react";

export function AccountabilityStatusPill({
  status,
  missing,
}: {
  status: "complete" | "incomplete";
  missing: Array<"owner" | "decision">;
}) {
  const label = status === "complete" ? "Complete" : "Incomplete";
  const reason =
    status === "complete"
      ? ""
      : missing.includes("owner") && missing.includes("decision")
      ? "Missing owner · decision"
      : missing.includes("owner")
      ? "Missing owner"
      : "Missing decision";

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/5 px-2 py-1 text-xs text-black/70 dark:border-white/10 dark:bg-white/10 dark:text-white/70">
      <span className="h-2 w-2 rounded-full bg-black/40 dark:bg-white/40" />
      <span>{label}</span>
      {reason ? <span className="text-black/40 dark:text-white/40">· {reason}</span> : null}
    </span>
  );
}

