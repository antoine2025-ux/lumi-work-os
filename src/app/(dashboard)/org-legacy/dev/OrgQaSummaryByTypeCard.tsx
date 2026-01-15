"use client";

import React from "react";
import { ORG_QA_QUESTIONS } from "@/lib/loopbrain/org-qa-questions";
import {
  applyOrgQaStatusOverrides,
  computeOrgQaSummaryByType,
} from "@/lib/loopbrain/org-qa-summary";
import type {
  OrgQaSummaryByType,
  OrgQaQuestionType,
  OrgQaStatusOverride,
} from "@/lib/loopbrain/org-qa-types";

type OrgQaSummaryByTypeCardProps = {
  selectedType: OrgQaQuestionType | "all";
  onSelectType: (next: OrgQaQuestionType | "all") => void;
  overrides?: OrgQaStatusOverride[];
};

export function OrgQaSummaryByTypeCard({
  selectedType,
  onSelectType,
  overrides = [],
}: OrgQaSummaryByTypeCardProps) {
  const effectiveQuestions = applyOrgQaStatusOverrides(
    ORG_QA_QUESTIONS,
    overrides
  );

  const summaries: OrgQaSummaryByType[] =
    computeOrgQaSummaryByType(effectiveQuestions);

  const totalQuestions = effectiveQuestions.length;
  const totalPass = summaries.reduce((acc, s) => acc + s.pass, 0);
  const totalPartial = summaries.reduce((acc, s) => acc + s.partial, 0);
  const totalFail = summaries.reduce((acc, s) => acc + s.fail, 0);

  return (
    <div className="rounded-2xl border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Org QA – By Question Type</h2>
          <p className="text-xs text-muted-foreground">
            Click a row to filter the QA panel by question type. Click again to
            reset.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {totalPass} pass
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            {totalPartial} partial
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            {totalFail} fail
          </span>
        </div>
      </div>

      <div className="divide-y text-xs">
        {summaries.map((s) => {
          const passPct = s.total ? Math.round((s.pass / s.total) * 100) : 0;
          const partialPct = s.total
            ? Math.round((s.partial / s.total) * 100)
            : 0;
          const failPct = s.total ? Math.round((s.fail / s.total) * 100) : 0;

          const isSelected = selectedType === s.type;

          const handleRowClick = () => {
            // Toggle behavior: click same type again → "all"
            if (isSelected) {
              onSelectType("all");
            } else {
              onSelectType(s.type);
            }
          };

          const rowClasses = [
            "flex items-center justify-between gap-4 px-4 py-3 cursor-pointer transition",
            isSelected
              ? "bg-muted/80"
              : "hover:bg-muted/60 dark:hover:bg-muted/30",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={s.type}
              type="button"
              className={rowClasses}
              onClick={handleRowClick}
            >
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-1">
                  <div className="text-xs font-medium">{s.label}</div>
                  {isSelected && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      Active filter
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {s.total} questions • {s.pass} pass • {s.partial} partial •{" "}
                  {s.fail} fail
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="flex h-full w-full">
                    {passPct > 0 && (
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${passPct}%` }}
                      />
                    )}
                    {partialPct > 0 && (
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${partialPct}%` }}
                      />
                    )}
                    {failPct > 0 && (
                      <div
                        className="h-full bg-rose-500"
                        style={{ width: `${failPct}%` }}
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold">
                  {s.total === 0 ? "—" : `${passPct}%`}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  pass rate
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {totalQuestions === 0 && (
        <div className="px-4 py-6 text-center text-xs text-muted-foreground">
          No QA questions defined yet.
        </div>
      )}
    </div>
  );
}

