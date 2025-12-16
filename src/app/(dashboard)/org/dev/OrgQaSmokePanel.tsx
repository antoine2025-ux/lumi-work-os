"use client";

import { useEffect, useState } from "react";

type OrgQaSmokeQuestion = {
  id: string;
  label: string;
  type: "person" | "team" | "department" | "org";
  status: "pass" | "partial" | "fail" | "stub";
  meta?: {
    description: string | null;
    category: string | null;
  };
};

type OrgQaSmokeResponse =
  | {
      ok: true;
      questions: OrgQaSmokeQuestion[];
      meta: {
        source: string;
        lastUpdated: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

const STATUS_COLORS: Record<OrgQaSmokeQuestion["status"], string> = {
  pass: "bg-emerald-500",
  partial: "bg-amber-500",
  fail: "bg-rose-500",
};

const STATUS_LABELS: Record<OrgQaSmokeQuestion["status"], string> = {
  pass: "Pass",
  partial: "Partial",
  fail: "Fail",
};

export function OrgQaSmokePanel() {
  const [data, setData] = useState<OrgQaSmokeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(null);
  const [questionLastRunAt, setQuestionLastRunAt] = useState<Record<string, string>>({});

  async function loadSmokeTests(questionIdToHighlight?: string) {
    try {
      setIsRunning(true);
      setError(null);
      setFocusedQuestionId(questionIdToHighlight ?? null);

      const res = await fetch("/api/loopbrain/org/qa/smoke");

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const json = (await res.json()) as OrgQaSmokeResponse;

      if (!json.ok) {
        throw new Error(json.error || "Failed to load smoke questions");
      }

      setData(json);
      setLastRunAt(new Date().toISOString());

      // Update per-question last run time if a specific question was targeted
      if (questionIdToHighlight) {
        setQuestionLastRunAt((prev) => ({
          ...prev,
          [questionIdToHighlight]: new Date().toISOString(),
        }));
      }
    } catch (err: any) {
      console.error("Failed to load Org QA smoke questions", err);
      setError(err?.message ?? "Failed to load smoke questions");
    } finally {
      setIsRunning(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSmokeTests();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border bg-muted/40 p-3 text-xs">
        <div className="text-xs font-medium">Org QA – Smoke Tests</div>
        <div className="text-[11px] text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border bg-destructive/10 p-3 text-xs">
        <div className="text-xs font-medium text-destructive">Org QA – Smoke Tests</div>
        <div className="text-[11px] text-destructive">{error}</div>
      </div>
    );
  }

  if (!data || !data.ok) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border bg-muted/40 p-3 text-xs">
        <div className="text-xs font-medium">Org QA – Smoke Tests</div>
        <div className="text-[11px] text-muted-foreground">No data available</div>
      </div>
    );
  }

  const { questions, meta } = data;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-muted/40 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-xs font-medium">Org QA – Smoke Tests</div>
            <button
              type="button"
              onClick={loadSmokeTests}
              disabled={isRunning}
              className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <>
                  <span className="h-2 w-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Running…
                </>
              ) : (
                "Run all smoke tests"
              )}
            </button>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>
              Questions loaded from {meta.source} (updated: {new Date(meta.lastUpdated).toLocaleString()})
            </span>
            {lastRunAt && (
              <>
                <span>•</span>
                <span>Last run: {new Date(lastRunAt).toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          {questions.length} questions
        </span>
      </div>

      <div className="mt-2 flex flex-col gap-1.5">
        {questions.length === 0 ? (
          <div className="rounded-xl border bg-background/70 p-4 text-center text-[11px] text-muted-foreground">
            No smoke test questions available.
          </div>
        ) : (
          questions.map((question) => {
            const isFocused = focusedQuestionId === question.id;
            const questionLastRun = questionLastRunAt[question.id];

            return (
              <div
                key={question.id}
                className={`flex items-start justify-between gap-2 rounded-xl border p-2 transition-colors ${
                  isFocused
                    ? "bg-primary/5 border-primary/30 shadow-sm"
                    : "bg-background/70"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-[11px] font-medium">{question.label}</div>
                    {isFocused && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                        Last re-run
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>Type: {question.type}</span>
                    {questionLastRun && (
                      <>
                        <span>•</span>
                        <span>Last run: {new Date(questionLastRun).toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${STATUS_COLORS[question.status]}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                    {STATUS_LABELS[question.status]}
                  </span>
                  <button
                    type="button"
                    onClick={() => loadSmokeTests(question.id)}
                    disabled={isRunning}
                    className="rounded-full border bg-muted px-2 py-0.5 text-[10px] font-medium hover:bg-muted/70 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Run
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

