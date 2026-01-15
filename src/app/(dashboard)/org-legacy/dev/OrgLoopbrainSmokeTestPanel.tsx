"use client";

import { useState } from "react";
import {
  ORG_LOOPBRAIN_SMOKE_TESTS,
  type OrgLoopbrainSmokeTest,
  type OrgSmokeTestStatus,
} from "./orgLoopbrainSmokeTests";
import type {
  OrgQaQuestionType,
  OrgQaStatusOverride,
  OrgQaStatus,
} from "@/lib/loopbrain/org-qa-types";
import { ORG_QA_QUESTIONS } from "@/lib/loopbrain/org-qa-questions";
import { applyOrgQaStatusOverrides } from "@/lib/loopbrain/org-qa-summary";

type LocalSmokeTestState = {
  [id: string]: OrgSmokeTestStatus;
};

const STATUS_LABEL: Record<OrgSmokeTestStatus, string> = {
  unknown: "Not checked",
  ok: "✅ OK",
  warning: "⚠️ Partial",
  fail: "❌ Wrong",
};

const STATUS_ORDER: OrgSmokeTestStatus[] = ["unknown", "ok", "warning", "fail"];

type OrgLoopbrainSmokeTestPanelProps = {
  filterType?: OrgQaQuestionType | "all";
  overrides?: OrgQaStatusOverride[];
  onStatusUpdate?: (override: OrgQaStatusOverride) => void;
};

// Map OrgSmokeTestStatus to OrgQaStatus
function mapSmokeTestStatusToQaStatus(
  status: OrgSmokeTestStatus
): OrgQaStatus | null {
  if (status === "ok") return "pass";
  if (status === "warning") return "partial";
  if (status === "fail") return "fail";
  return null; // "unknown" doesn't map to QA status
}

// Map OrgQaStatus to OrgSmokeTestStatus
function mapQaStatusToSmokeTestStatus(
  status: OrgQaStatus
): OrgSmokeTestStatus {
  if (status === "pass") return "ok";
  if (status === "partial") return "warning";
  return "fail";
}

export function OrgLoopbrainSmokeTestPanel({
  filterType = "all",
  overrides = [],
  onStatusUpdate,
}: OrgLoopbrainSmokeTestPanelProps) {
  const [statusById, setStatusById] = useState<LocalSmokeTestState>({});

  // Apply overrides to get effective QA questions
  const effectiveQuestions = applyOrgQaStatusOverrides(
    ORG_QA_QUESTIONS,
    overrides
  );

  // Create a map from smoke test ID to QA question type and status
  const smokeTestIdToType = new Map<string, OrgQaQuestionType>();
  const smokeTestIdToQaStatus = new Map<string, OrgQaStatus>();
  for (const qaQuestion of effectiveQuestions) {
    smokeTestIdToType.set(qaQuestion.id, qaQuestion.type);
    smokeTestIdToQaStatus.set(qaQuestion.id, qaQuestion.status);
  }

  // Filter smoke tests based on filterType
  const filteredTests =
    filterType === "all"
      ? ORG_LOOPBRAIN_SMOKE_TESTS
      : ORG_LOOPBRAIN_SMOKE_TESTS.filter((test) => {
          const testType = smokeTestIdToType.get(test.id);
          return testType === filterType;
        });

  function cycleStatus(id: string) {
    setStatusById((prev) => {
      const current = prev[id] ?? "unknown";
      const idx = STATUS_ORDER.indexOf(current);
      const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];

      const newState = {
        ...prev,
        [id]: next,
      };

      // Sync to QA status override if callback provided
      if (onStatusUpdate) {
        const qaStatus = mapSmokeTestStatusToQaStatus(next);
        if (qaStatus) {
          onStatusUpdate({
            id,
            status: qaStatus,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      return newState;
    });
  }

  function getStatus(id: string): OrgSmokeTestStatus {
    // First check local state (for manual cycling)
    const localStatus = statusById[id];
    if (localStatus) return localStatus;

    // Then check QA status override
    const qaStatus = smokeTestIdToQaStatus.get(id);
    if (qaStatus) {
      return mapQaStatusToSmokeTestStatus(qaStatus);
    }

    return "unknown";
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-muted/40 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="text-xs font-medium">Org → Loopbrain smoke-test checklist</div>
          <div className="text-[11px] text-muted-foreground">
            {filterType === "all"
              ? "Canonical Org questions to run through the Org QA panel and compare against the Org UI. Latest run statuses are reflected in the summary above."
              : `Filtered by: ${filterType}`}
          </div>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          Manual QA
        </span>
      </div>

      <div className="mt-1 rounded-xl bg-background/60 p-2 text-[11px] text-muted-foreground">
        How to use:
        <ol className="ml-4 list-decimal space-y-0.5">
          <li>Ask each question in the Org QA panel (Ask Loopbrain about your Org).</li>
          <li>Compare Loopbrain&apos;s answer with what the Org UI shows (people, teams, roles, health).</li>
          <li>Click the status pill to cycle between Not checked → ✅ OK → ⚠️ Partial → ❌ Wrong.</li>
        </ol>
      </div>

      <div className="mt-2 flex flex-col gap-1.5">
        {filteredTests.length === 0 ? (
          <div className="rounded-xl border bg-background/70 p-4 text-center text-[11px] text-muted-foreground">
            No smoke tests for this filter yet.
          </div>
        ) : (
          filteredTests.map((test) => {
            const status = getStatus(test.id);

          return (
            <div
              key={test.id}
              className="flex flex-col gap-1 rounded-xl border bg-background/70 p-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-[11px] font-medium">
                    {test.question}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Intent: {test.intent}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => cycleStatus(test.id)}
                  className="rounded-full border bg-muted px-2 py-0.5 text-[10px] font-medium hover:bg-muted/70"
                >
                  {STATUS_LABEL[status]}
                </button>
              </div>
              <div className="text-[10px] text-muted-foreground">
                Expected answer shape: {test.expectedShape}
              </div>
            </div>
          );
          })
        )}
      </div>

      <div className="mt-1 text-[10px] text-muted-foreground">
        Note: Status is stored only in this browser session for now. This panel is
        meant as a quick manual QA checklist when evolving Org or Loopbrain.
      </div>
    </div>
  );
}

