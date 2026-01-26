// src/components/org/OrgQaPanel.tsx
"use client";

import React, { useState } from "react";
import type {
  OrgQaQuestionWithStatus,
  OrgQaQuestionType,
} from "@/lib/org/qa/types";
import { OrgQaStatusPill } from "./OrgQaStatusPill";

type FilterType = OrgQaQuestionType | "all";

const typeLabel: Record<OrgQaQuestionType, string> = {
  person: "People",
  team: "Teams",
  department: "Departments",
  org: "Org",
};

const STUB_QUESTIONS: OrgQaQuestionWithStatus[] = [
  {
    id: "q-person-1",
    label: "Does every person have at least one role?",
    type: "person",
    status: "stub",
    category: "coverage",
    description: "Checks if all people have responsibilities assigned.",
  },
  {
    id: "q-team-1",
    label: "Which teams have unclear ownership?",
    type: "team",
    status: "stub",
    category: "ownership",
    description: "Detects teams without clear accountability.",
  },
  {
    id: "q-dept-1",
    label: "Which departments are overloaded?",
    type: "department",
    status: "stub",
    category: "workload",
    description: "Highlights structural imbalance in departments.",
  },
  {
    id: "q-org-1",
    label: "What are the biggest org hotspots right now?",
    type: "org",
    status: "stub",
    category: "hotspots",
    description: "Identifies company-wide risk areas.",
  },
];

function summarizeByType(questions: OrgQaQuestionWithStatus[]) {
  const base: Record<OrgQaQuestionType, number> = {
    person: 0,
    team: 0,
    department: 0,
    org: 0,
  };
  return questions.reduce((acc, q) => {
    acc[q.type] += 1;
    return acc;
  }, base);
}

export function OrgQaPanel() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [questions] = useState<OrgQaQuestionWithStatus[]>(STUB_QUESTIONS);

  const summary = summarizeByType(questions);

  const filtered =
    filter === "all"
      ? questions
      : questions.filter((q) => q.type === filter);

  const handleRun = (id: string) => {
    console.log("[OrgQaPanel] Run QA question:", id);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Org QA – Loopbrain readiness</h2>
        <p className="text-sm text-muted-foreground">
          Structured questions that help Loopbrain understand the health of your org.
        </p>
      </header>

      <div className="inline-flex bg-muted rounded-full px-2 py-1 gap-2 text-xs">
        <button
          onClick={() => setFilter("all")}
          className={
            filter === "all"
              ? "bg-background px-2 py-0.5 rounded-full font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground px-2 py-0.5"
          }
        >
          All ({questions.length})
        </button>

        {(["person", "team", "department", "org"] as OrgQaQuestionType[]).map(
          (t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={
                filter === t
                  ? "bg-background px-2 py-0.5 rounded-full font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground px-2 py-0.5"
              }
            >
              {typeLabel[t]} ({summary[t]})
            </button>
          )
        )}
      </div>

      <section className="rounded-xl border p-4">
        <h3 className="text-sm font-medium mb-3">Questions</h3>

        <div className="divide-y">
          {filtered.map((q) => (
            <div
              key={q.id}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{q.label}</span>
                  <OrgQaStatusPill status={q.status} />
                </div>
                {q.description && (
                  <p className="text-xs text-muted-foreground">{q.description}</p>
                )}
              </div>

              <button
                onClick={() => handleRun(q.id)}
                className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-md shadow-sm hover:bg-primary/90"
              >
                Run
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

