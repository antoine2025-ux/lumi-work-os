"use client";

import { useState } from "react";
import { OrgQaSummaryByTypeCard } from "./OrgQaSummaryByTypeCard";
import { OrgLoopbrainSmokeTestPanel } from "./OrgLoopbrainSmokeTestPanel";
import type {
  OrgQaQuestionType,
  OrgQaStatusOverride,
} from "@/lib/loopbrain/org-qa-types";
import { ORG_QA_QUESTIONS } from "@/lib/loopbrain/org-qa-questions";
import {
  applyOrgQaStatusOverrides,
  computeOrgQaSummaryByType,
} from "@/lib/loopbrain/org-qa-summary";
import type { OrgQaSnapshotPayload } from "@/lib/loopbrain/org-qa-snapshot";

export function OrgDevPageClient() {
  const [qaFilterType, setQaFilterType] = useState<OrgQaQuestionType | "all">(
    "all"
  );

  // Runtime status overrides for this session
  const [qaOverrides, setQaOverrides] = useState<OrgQaStatusOverride[]>([]);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportFile, setLastExportFile] = useState<string | null>(null);
  const [lastExportError, setLastExportError] = useState<string | null>(null);

  const handleUpdateQaStatus = (override: OrgQaStatusOverride) => {
    setQaOverrides((prev) => {
      const existingIndex = prev.findIndex((o) => o.id === override.id);
      if (existingIndex === -1) {
        return [...prev, override];
      }
      const next = [...prev];
      next[existingIndex] = override;
      return next;
    });
  };

  const handleExportSnapshot = async () => {
    try {
      setIsExporting(true);
      setLastExportError(null);
      setLastExportFile(null);

      const generatedAt = new Date().toISOString();

      const effectiveQuestions = applyOrgQaStatusOverrides(
        ORG_QA_QUESTIONS,
        qaOverrides
      );
      const summaryByType = computeOrgQaSummaryByType(effectiveQuestions);

      const payload: OrgQaSnapshotPayload = {
        generatedAt,
        label: "Org → Loopbrain QA snapshot",
        questions: effectiveQuestions,
        summaryByType,
      };

      const res = await fetch("/api/dev/org/qa-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Export failed");
      }

      setLastExportFile(data.file);
    } catch (err: any) {
      console.error("Failed to export QA snapshot", err);
      setLastExportError(err?.message ?? "Unknown error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
        <div>
          <h2 className="text-sm font-semibold">QA Snapshot Export</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Export current QA status (including runtime overrides) to a markdown file for version control.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={handleExportSnapshot}
            disabled={isExporting}
            className="inline-flex items-center gap-1 rounded-full border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
          >
            {isExporting ? "Exporting…" : "Export QA snapshot (Markdown)"}
          </button>
          {lastExportFile && (
            <div className="text-[11px] text-muted-foreground">
              Last export: <code className="rounded bg-muted px-1">{lastExportFile}</code>
            </div>
          )}
          {lastExportError && (
            <div className="text-[11px] text-destructive">
              Export failed: {lastExportError}
            </div>
          )}
        </div>
      </div>

      <OrgQaSummaryByTypeCard
        selectedType={qaFilterType}
        onSelectType={(next) => setQaFilterType(next)}
        overrides={qaOverrides}
      />
      <OrgLoopbrainSmokeTestPanel
        filterType={qaFilterType}
        overrides={qaOverrides}
        onStatusUpdate={handleUpdateQaStatus}
      />
    </>
  );
}

