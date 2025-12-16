"use client";

import React from "react";
import type { OrgStatus } from "./status";

export function StatusPill({
  status,
  impactHint,
  showImpactHint = false,
}: {
  status: OrgStatus;
  impactHint?: "high" | "medium" | "low";
  showImpactHint?: boolean;
}) {
  const base =
    "inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-medium";
  const styles =
    status.level === "complete"
      ? "border-black/10 bg-black/5 text-black/70 dark:border-white/10 dark:bg-white/10 dark:text-white/70"
      : status.level === "risk"
      ? "border-black/10 bg-black/5 text-black/70 dark:border-white/10 dark:bg-white/10 dark:text-white/70"
      : "border-black/10 bg-black/5 text-black/70 dark:border-white/10 dark:bg-white/10 dark:text-white/70";

  const dot =
    status.level === "complete"
      ? "bg-black/40 dark:bg-white/40"
      : status.level === "risk"
      ? "bg-black/50 dark:bg-white/50"
      : "bg-black/50 dark:bg-white/50";

  const impactLabel =
    impactHint === "high"
      ? "High impact"
      : impactHint === "medium"
      ? "Medium impact"
      : impactHint === "low"
      ? "Low impact"
      : null;

  return (
    <span className={`${base} ${styles}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span>{status.label}</span>
      {status.reason ? <span className="text-black/40 dark:text-white/40">· {status.reason}</span> : null}
      {showImpactHint && impactLabel && status.level !== "complete" ? (
        <span className="text-black/40 dark:text-white/40">· {impactLabel}</span>
      ) : null}
    </span>
  );
}
