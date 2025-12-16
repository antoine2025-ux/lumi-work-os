"use client";

import React, { useState } from "react";
import { useOrgLoopbrainChat } from "@/lib/hooks/useOrgLoopbrainChat";
import { useUserStatus } from "@/hooks/use-user-status";
import { OrgLoopbrainAnswer } from "./OrgLoopbrainAnswer";

const SUGGESTED_QUESTIONS = [
  "Who leads the Platform team?",
  "Which teams are in Engineering?",
  "Who reports to our Head of Engineering?",
  "What roles exist in the Product department?",
];

export function OrgAskLoopbrainPanel() {
  const [question, setQuestion] = useState("");
  const [meta, setMeta] = useState<{
    contextItemsCount?: number;
  } | null>(null);
  
  const { userStatus } = useUserStatus();
  const workspaceId = userStatus?.workspaceId || "";
  const { loading, error, answer, response, askOrgQuestion } = useOrgLoopbrainChat();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || !workspaceId) return;

    // Reset state
    setMeta(null);

    // Call the new org-aware Loopbrain endpoint
    await askOrgQuestion({
      workspaceId,
      question: trimmed,
      location: {
        mode: "org",
        view: "org.overview",
        workspaceId,
      },
    });

    // Extract metadata from response if available
    if (response) {
      setMeta({
        contextItemsCount: response.metadata?.retrievedCount,
      });
    }
  }

  function handleSuggestionClick(text: string) {
    setQuestion(text);
    setMeta(null);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium">Ask Loopbrain about your Org</h2>
          <p className="text-xs text-muted-foreground">
            Ask questions about people, teams, roles, and structure. Answers are grounded in your Org data.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
          Loopbrain · Org-aware
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder='E.g. "Who leads the Platform team?"'
          className="min-h-[70px] w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />

        <div className="flex items-center justify-between gap-2">
          <button
            type="submit"
            disabled={loading || !question.trim() || !workspaceId}
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
          >
            {loading ? "Asking Loopbrain…" : "Ask Loopbrain"}
          </button>

          <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
            <span className="mr-1">Suggested:</span>
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSuggestionClick(q)}
                className="rounded-full border bg-background px-2 py-0.5 text-[10px] hover:bg-muted"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </form>

      <OrgLoopbrainAnswer
        answer={answer}
        loading={loading}
        error={error}
        className="mt-1"
      />

      {answer && meta?.contextItemsCount != null && (
        <div className="text-[10px] text-muted-foreground">
          Based on {meta.contextItemsCount} Org context objects
          (departments, teams, roles, people).
        </div>
      )}

      {!answer && !error && !loading && (
        <div className="text-[10px] text-muted-foreground">
          Tip: Ask about reporting lines, team membership, or who owns a given role.
        </div>
      )}
    </div>
  );
}

