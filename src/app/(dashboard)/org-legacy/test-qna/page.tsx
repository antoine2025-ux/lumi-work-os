"use client";

import { useState } from "react";

type OrgQnaResponse = {
  ok: boolean;
  answer?: string;
  question?: string;
  orgPreamble?: string;
  combinedPrompt?: string;
  metadata?: any;
  debug?: any;
  error?: string;
};

export default function OrgQnaDevPage() {
  const [question, setQuestion] = useState(
    "Which managers have the largest span of control?"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<OrgQnaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/loopbrain/org/qna", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          metadata: {
            source: "org-qna-dev-panel",
            location: "org-test-qna",
          },
        }),
      });

      const data = (await res.json()) as OrgQnaResponse;

      if (!res.ok || !data.ok) {
        setError(data.error || `Request failed with status ${res.status}`);
      }

      setResponse(data);
    } catch (err: any) {
      console.error("Org Q&A dev panel error", err);
      setError(err?.message || "Unexpected error while calling Org Q&A endpoint");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Loopbrain · Org
          </p>
          <h1 className="text-2xl font-semibold">
            Org Q&amp;A Dev Panel
          </h1>
          <p className="text-sm text-muted-foreground">
            Internal testing page for the
            {" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              /api/loopbrain/org/qna
            </code>
            {" "}
            endpoint. This will later be wired to the real Loopbrain client.
          </p>
        </header>

        <section className="rounded-lg border bg-card p-4 shadow-sm">
          <form onSubmit={handleAsk} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Org question
              </span>
              <textarea
                className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-primary"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask something about your org, e.g. 'Which teams are single-point of failure?'"
              />
            </label>

            <div className="flex items-center justify-between gap-3">
              <button
                type="submit"
                disabled={isLoading || !question.trim()}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Asking…" : "Ask Org Q&A stub"}
              </button>

              <p className="text-xs text-muted-foreground">
                Sends a POST to
                {" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                  /api/loopbrain/org/qna
                </code>
                .
              </p>
            </div>
          </form>
        </section>

        {error && (
          <section className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <p className="font-medium">Request error</p>
            <p className="mt-1 text-xs">{error}</p>
          </section>
        )}

        {response && (
          <section className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold">Answer</h2>
              <pre className="max-h-64 overflow-auto rounded bg-muted p-3 text-xs leading-relaxed">
                {response.answer || "(no answer field returned)"}
              </pre>

              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  ok:
                  {" "}
                  <code>{String(response.ok)}</code>
                </p>
                {response.question && (
                  <p>
                    question:
                    {" "}
                    <code>{response.question}</code>
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold">Combined prompt (debug)</h2>
              <pre className="max-h-64 overflow-auto rounded bg-muted p-3 text-[11px] leading-relaxed">
                {response.combinedPrompt || "(no combinedPrompt field returned)"}
              </pre>

              <details className="mt-1 text-xs text-muted-foreground">
                <summary className="cursor-pointer select-none text-xs font-medium">
                  Metadata / debug
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted p-2 text-[11px]">
                  {JSON.stringify(
                    {
                      metadata: response.metadata ?? null,
                      debug: response.debug ?? null,
                    },
                    null,
                    2
                  )}
                </pre>
              </details>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

