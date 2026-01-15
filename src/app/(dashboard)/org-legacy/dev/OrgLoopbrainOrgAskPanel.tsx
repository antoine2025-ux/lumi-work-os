"use client";

import { useState } from "react";

export function OrgLoopbrainOrgAskPanel() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/loopbrain/org/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), limit: 80 }),
      });

      const json = await res.json();
      setResult(JSON.stringify(json, null, 2));
    } catch (error) {
      console.error("[OrgLoopbrainOrgAskPanel] Request failed", error);
      setResult("Request failed. See console for details.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-muted/40 p-3 text-xs">
      <form onSubmit={handleAsk} className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-medium">Try an Org-aware question</div>
            <div className="text-[11px] text-muted-foreground">
              Sends a question to <code>/api/loopbrain/org/ask</code> and shows the
              prompt payload (no LLM call yet).
            </div>
          </div>
        </div>

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder='E.g. "Who leads Platform?" or "Which teams are in Engineering?"'
          className="min-h-[60px] w-full rounded-xl border bg-background px-2 py-1.5 text-xs"
        />

        <div className="flex items-center justify-between gap-2">
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="inline-flex items-center justify-center rounded-full bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground disabled:opacity-60"
          >
            {loading ? "Building prompt…" : "Build Org prompt"}
          </button>
          <div className="text-[10px] text-muted-foreground">
            Uses Org ContextItems (department, team, role, person) from the context
            store.
          </div>
        </div>
      </form>

      {result && (
        <pre className="mt-1 max-h-64 overflow-auto rounded-xl bg-background p-2 text-[10px]">
          {result}
        </pre>
      )}
    </div>
  );
}

