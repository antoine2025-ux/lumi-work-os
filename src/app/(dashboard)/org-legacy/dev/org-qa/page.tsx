// src/app/(dashboard)/org/dev/org-qa/page.tsx

"use client";

import React, { useState } from "react";

type OrgQaResponse = {
  ok: boolean;
  workspaceId: string;
  question: string;
  finalAnswer: string;
  promptDebug: {
    systemPrompt: string;
    userPrompt: string;
  };
  orgContextSummary: {
    type: string;
    hasOrgRoot: boolean;
    peopleCount: number;
    teamCount: number;
    departmentCount: number;
    roleCount: number;
  };
  referencedContext: {
    footer: string;
  };
  error?: string;
};

export default function OrgQaDevPage() {
  const [workspaceId, setWorkspaceId] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrgQaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setError(null);
    setResult(null);

    if (!workspaceId || !question) {
      setError("workspaceId and question are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/dev/org-qa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workspaceId, question }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || data.message || "Request failed");
      } else {
        setResult(data as OrgQaResponse);
      }
    } catch (e: any) {
      console.error("[OrgQaDevPage] Error:", e);
      setError(e?.message || "Unexpected error while calling /api/dev/org-qa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between border-b border-gray-700 pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Org QA Dev Panel</h1>
          <p className="text-sm text-gray-400">
            Internal tool to exercise the Org → Loopbrain pipeline using /api/dev/org-qa.
          </p>
        </div>
        <span className="rounded-full bg-yellow-900/40 px-3 py-1 text-xs font-medium text-yellow-300 border border-yellow-700">
          Dev only
        </span>
      </header>

      <section className="grid gap-4 rounded-lg border border-gray-700 bg-gray-900/40 p-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-200">
            Workspace ID
          </label>
          <input
            className="w-full rounded-md border border-gray-600 bg-gray-800/60 px-3 py-2 text-sm text-gray-100 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
            placeholder="workspace_cuid_here"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-gray-200">
            Question
          </label>
          <textarea
            className="min-h-[80px] w-full rounded-md border border-gray-600 bg-gray-800/60 px-3 py-2 text-sm text-gray-100 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
            placeholder="e.g. What is our current headcount by department?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRun}
            disabled={loading}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Running..." : "Run Org QA"}
          </button>
          {error && (
            <span className="text-sm text-red-400">
              {error}
            </span>
          )}
        </div>
      </section>

      {result && (
        <section className="grid gap-4 rounded-lg border border-gray-700 bg-gray-900/40 p-4">
          <div className="grid gap-1">
            <h2 className="text-lg font-semibold text-gray-200">Final Answer</h2>
            <p className="text-xs text-gray-400">
              Includes guardrails + referenced context footer from the backend.
            </p>
            <pre className="mt-2 max-h-[260px] overflow-auto rounded-md bg-gray-800/60 p-3 text-xs leading-relaxed text-gray-100 whitespace-pre-wrap">
              {result.finalAnswer}
            </pre>
          </div>

          <div className="grid gap-1">
            <h2 className="text-lg font-semibold text-gray-200">Org Context Summary</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-300">
                <span className="font-medium">Context type:</span>{" "}
                <span className="text-gray-400">{result.orgContextSummary.type}</span>
              </div>
              <div className="text-gray-300">
                <span className="font-medium">Has org root:</span>{" "}
                <span className="text-gray-400">{result.orgContextSummary.hasOrgRoot ? "Yes" : "No"}</span>
              </div>
              <div className="text-gray-300">
                <span className="font-medium">People:</span>{" "}
                <span className="text-gray-400">{result.orgContextSummary.peopleCount}</span>
              </div>
              <div className="text-gray-300">
                <span className="font-medium">Teams:</span>{" "}
                <span className="text-gray-400">{result.orgContextSummary.teamCount}</span>
              </div>
              <div className="text-gray-300">
                <span className="font-medium">Departments:</span>{" "}
                <span className="text-gray-400">{result.orgContextSummary.departmentCount}</span>
              </div>
              <div className="text-gray-300">
                <span className="font-medium">Roles:</span>{" "}
                <span className="text-gray-400">{result.orgContextSummary.roleCount}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-1">
            <h2 className="text-lg font-semibold text-gray-200">Prompt Debug</h2>
            <details className="rounded-md border border-gray-700 bg-gray-800/60 p-3 text-xs">
              <summary className="cursor-pointer text-sm font-medium text-gray-200 hover:text-gray-100">
                System Prompt
              </summary>
              <pre className="mt-2 max-h-[200px] overflow-auto whitespace-pre-wrap text-gray-300">
                {result.promptDebug.systemPrompt}
              </pre>
            </details>

            <details className="mt-2 rounded-md border border-gray-700 bg-gray-800/60 p-3 text-xs">
              <summary className="cursor-pointer text-sm font-medium text-gray-200 hover:text-gray-100">
                User Prompt
              </summary>
              <pre className="mt-2 max-h-[200px] overflow-auto whitespace-pre-wrap text-gray-300">
                {result.promptDebug.userPrompt}
              </pre>
            </details>
          </div>

          <div className="grid gap-1">
            <h2 className="text-lg font-semibold text-gray-200">Referenced Context Footer</h2>
            <p className="text-xs text-gray-400">
              Extracted from the answer; shows which org objects/tags Loopbrain used.
            </p>
            <pre className="mt-2 max-h-[160px] overflow-auto rounded-md bg-gray-800/60 p-3 text-xs leading-relaxed text-gray-100 whitespace-pre-wrap">
              {result.referencedContext.footer || "No referenced context footer found."}
            </pre>
          </div>
        </section>
      )}
    </div>
  );
}

