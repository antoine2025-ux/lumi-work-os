"use client";

import React, { useEffect, useState } from "react";
import type { OrgQaQuestionWithStatus } from "@/lib/org/qa/types";

interface OrgQaSmokeResponse {
  ok: boolean;
  questions?: OrgQaQuestionWithStatus[];
  error?: string;
}

export function OrgLoopbrainStatusClient() {
  const [questions, setQuestions] = useState<OrgQaQuestionWithStatus[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/loopbrain/org/qa/smoke", {
          method: "GET",
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as OrgQaSmokeResponse;
          const message =
            body?.error ??
            `Failed to load Org QA status (HTTP ${res.status})`;

          if (!cancelled) {
            setError(message);
            setQuestions(null);
          }
          return;
        }

        const body = (await res.json()) as OrgQaSmokeResponse;

        if (!body.ok) {
          if (!cancelled) {
            setError(body.error ?? "Org QA status returned ok=false");
            setQuestions(null);
          }
          return;
        }

        if (!cancelled) {
          setQuestions(body.questions ?? []);
          setError(null);
        }
      } catch (err) {
        console.error("Error loading Org QA smoke tests:", err);
        if (!cancelled) {
          setError("Unexpected error loading Org QA status");
          setQuestions(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const lastUpdatedIso =
    questions && questions.length > 0
      ? questions
          .map((q) => q.lastUpdated)
          .filter((v): v is string => !!v)
          .sort()
          .slice(-1)[0]
      : null;

  const lastUpdatedDisplay = lastUpdatedIso
    ? new Date(lastUpdatedIso).toLocaleString()
    : null;

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Org Loopbrain QA — Dev status
        </h1>
        <p className="text-sm text-muted-foreground">
          Internal-only view of Org QA questions and their pass / fail state
          for the current workspace.
        </p>
      </header>

      <section className="rounded-lg border bg-card p-4 text-sm">
        <p className="font-medium">
          This page is **dev tooling** and not visible to customers.
        </p>
        <ul className="mt-2 list-disc pl-5 text-muted-foreground">
          <li>Uses real workspace data for Org QA evaluation.</li>
          <li>Results are read-only; running QA does not modify org data.</li>
          <li>Use this to sanity-check Org graph coverage and rules.</li>
        </ul>
      </section>

      {isLoading && (
        <div className="rounded-md border bg-muted/40 p-4 text-sm">
          <p className="font-medium">Loading Org QA status…</p>
          <p className="mt-1 text-muted-foreground">
            Fetching smoke-test questions from{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              /api/loopbrain/org/qa/smoke
            </code>
            .
          </p>
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <p className="font-medium text-destructive">
            Failed to load Org QA status
          </p>
          <p className="mt-1 text-destructive/90">{error}</p>
        </div>
      )}

      {!isLoading && !error && questions && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <p className="font-medium">
              Questions ({questions.length.toString()})
            </p>
            {lastUpdatedDisplay && (
              <p className="text-muted-foreground">
                Last updated:{" "}
                <span className="font-mono">{lastUpdatedDisplay}</span>
              </p>
            )}
          </div>

          {questions.length === 0 && (
            <div className="rounded-md border bg-muted/40 p-4 text-sm">
              <p className="font-medium">No Org QA questions returned.</p>
              <p className="mt-1 text-muted-foreground">
                Check that the evaluator is configured and the smoke-test
                route is wired up correctly.
              </p>
            </div>
          )}

          {questions.length > 0 && (
            <div className="overflow-hidden rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/60">
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-medium">
                      Question
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Type
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Last updated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <tr key={q.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 align-top">
                        <div className="font-medium">{q.label}</div>
                        {q.description && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {q.description}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-xs uppercase tracking-wide text-muted-foreground">
                        {q.type}
                      </td>
                      <td className="px-3 py-2 align-top text-xs">
                        {q.status}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                        {q.lastUpdated
                          ? new Date(q.lastUpdated).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

