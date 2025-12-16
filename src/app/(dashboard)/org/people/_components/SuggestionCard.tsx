"use client";

import React, { useState } from "react";

export function SuggestionCard({
  confidence,
  rationale,
  evidence,
  personId,
  suggestionRunId,
  onFeedback,
}: {
  confidence: number;
  rationale: string;
  evidence?: Array<{ label: string; value: string }>;
  personId?: string;
  suggestionRunId?: string;
  onFeedback?: (accepted: boolean) => void;
}) {
  const pct = Math.round((confidence || 0) * 100);
  const [feedbackSent, setFeedbackSent] = useState(false);

  async function sendFeedback(accepted: boolean) {
    if (feedbackSent) return;
    try {
      await fetch("/api/org/loopbrain/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId,
          suggestionRunId,
          confidence,
          accepted,
          feedback: accepted ? null : "User marked suggestion as not helpful",
        }),
      });
      setFeedbackSent(true);
      if (onFeedback) onFeedback(accepted);
    } catch (error) {
      console.warn("Failed to send feedback:", error);
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-black/60 dark:text-white/60">LoopBrain suggestion</div>
          <div className="mt-1 text-sm text-black/80 dark:text-white/80">{rationale || "—"}</div>
        </div>
        <div className="shrink-0 rounded-full border border-black/10 bg-black/5 px-2 py-1 text-xs text-black/60 dark:border-white/10 dark:bg-white/10 dark:text-white/60">
          {pct}% confidence
        </div>
      </div>

      {evidence && evidence.length > 0 ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {evidence.slice(0, 4).map((e, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-black/10 bg-white/60 p-2 text-xs dark:border-white/10 dark:bg-white/5"
            >
              <div className="text-black/50 dark:text-white/50">{e.label}</div>
              <div className="mt-0.5 font-medium text-black/80 dark:text-white/80">{e.value}</div>
            </div>
          ))}
        </div>
      ) : null}

      {(personId || suggestionRunId) && !feedbackSent ? (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <button
            onClick={() => sendFeedback(true)}
            className="rounded-full border border-black/10 bg-white px-2 py-1 text-black/70 hover:bg-black/5 dark:border-white/10 dark:bg-black dark:text-white/70 dark:hover:bg-white/10"
          >
            👍 Helpful
          </button>
          <button
            onClick={() => sendFeedback(false)}
            className="rounded-full border border-black/10 bg-white px-2 py-1 text-black/70 hover:bg-black/5 dark:border-white/10 dark:bg-black dark:text-white/70 dark:hover:bg-white/10"
          >
            👎 Not helpful
          </button>
        </div>
      ) : feedbackSent ? (
        <div className="mt-3 text-xs text-black/50 dark:text-white/50">Thanks for your feedback!</div>
      ) : null}
    </div>
  );
}

