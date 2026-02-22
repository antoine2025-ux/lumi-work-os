"use client";

import React, { useEffect, useState } from "react";
import type {
  OrgQaQuestionWithStatus,
  OrgQaStatus,
} from "@/lib/org/qa/types";
import OrgQaStatusPill from "@/components/org/OrgQaStatusPill";

interface OrgQaListState {
  loading: boolean;
  error: string | null;
  questions: OrgQaQuestionWithStatus[];
}

export default function OrgQaStatusList() {
  const [state, setState] = useState<OrgQaListState>({
    loading: true,
    error: null,
    questions: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/loopbrain/org/qa/smoke");
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json() as {
          ok: boolean;
          questions?: OrgQaQuestionWithStatus[];
          error?: string;
        };

        if (cancelled) return;

        if (!data.ok || !data.questions) {
          setState({
            loading: false,
            error: data.error || "Failed to load Org QA status.",
            questions: [],
          });
          return;
        }

        setState({
          loading: false,
          error: null,
          questions: data.questions,
        });
      } catch (error: unknown) {
        if (cancelled) return;
        setState({
          loading: false,
          error: error instanceof Error ? error.message : "Unexpected error while loading Org QA.",
          questions: [],
        });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading Org QA checks…
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-destructive font-medium">
          Failed to load Org QA status
        </div>
        <div className="text-xs text-muted-foreground">
          {state.error}
        </div>
      </div>
    );
  }

  if (!state.questions.length) {
    return (
      <div className="text-sm text-muted-foreground">
        No Org QA questions found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {state.questions.map((q) => (
        <div
          key={q.id}
          className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2"
        >
          <div className="space-y-1">
            <div className="text-sm font-medium">
              {q.label}
            </div>
            {q.description && (
              <div className="text-xs text-muted-foreground">
                {q.description}
              </div>
            )}
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Type: {q.type}
              {q.lastUpdated && (
                <span className="ml-2">
                  • Updated: {new Date(q.lastUpdated).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0">
            <OrgQaStatusPill status={q.status as OrgQaStatus} />
          </div>
        </div>
      ))}
    </div>
  );
}

