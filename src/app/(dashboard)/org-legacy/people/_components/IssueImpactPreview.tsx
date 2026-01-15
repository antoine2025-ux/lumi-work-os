"use client";

import React from "react";
import type { ImpactPreview } from "@/lib/loopbrain/impactPreview";

export function IssueImpactPreview({
  preview,
}: {
  preview: ImpactPreview;
}) {
  if (!preview.completenessDelta && !preview.explanation) {
    return null;
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white/60 p-3 text-xs dark:border-white/10 dark:bg-white/5">
      <div className="font-medium text-black/80 dark:text-white/80">
        Why this matters
      </div>

      <div className="mt-1 text-black/60 dark:text-white/60">
        {preview.explanation}
      </div>

      {preview.completenessDelta ? (
        <div className="mt-2 space-y-1 text-black/60 dark:text-white/60">
          {preview.completenessDelta.reportingLines ? (
            <div>Reporting lines: +{preview.completenessDelta.reportingLines}%</div>
          ) : null}
          {preview.completenessDelta.teams ? (
            <div>Teams assigned: +{preview.completenessDelta.teams}%</div>
          ) : null}
          {preview.completenessDelta.roles ? (
            <div>Roles assigned: +{preview.completenessDelta.roles}%</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

