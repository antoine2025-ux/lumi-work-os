"use client";

import React, { useState } from "react";
import { useOrgLoopbrainChat } from "@/lib/hooks/useOrgLoopbrainChat";
import { LoopbrainLocation } from "@/lib/loopbrain/location";
import { useUserStatus } from "@/hooks/use-user-status";
import { OrgLoopbrainAnswer } from "./OrgLoopbrainAnswer";

type TeamLoopbrainPanelProps = {
  teamId: string;
  teamName?: string;
};

export function TeamLoopbrainPanel({ teamId, teamName }: TeamLoopbrainPanelProps) {
  const { userStatus } = useUserStatus();
  const workspaceId = userStatus?.workspaceId || "";
  const [question, setQuestion] = useState("");
  const { loading, error, answer, askOrgQuestion } = useOrgLoopbrainChat();

  const handleAsk = async () => {
    if (!workspaceId || !teamId || !question.trim()) return;

    const location: LoopbrainLocation = {
      mode: "org",
      view: "org.team",
      workspaceId,
      teamId,
    };

    await askOrgQuestion({
      workspaceId,
      question: question.trim(),
      location,
    });
  };

  return (
    <div className="flex h-full flex-col gap-3 rounded-lg border bg-background p-3">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold">
          Ask Loopbrain about {teamName ?? "this team"}
        </h3>
        <p className="text-xs text-muted-foreground">
          Team size, span of control, risks, and structure, based on Org data.
        </p>
      </div>

      <textarea
        className="min-h-[60px] w-full rounded-md border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        placeholder="e.g. Is this team overloaded or risky? Who is on this team?"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleAsk}
          disabled={loading || !question.trim()}
          className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Thinking…" : "Ask"}
        </button>
        {error && (
          <span className="text-xs text-destructive">{error}</span>
        )}
      </div>

      <OrgLoopbrainAnswer
        answer={answer}
        loading={loading}
        error={error}
      />
    </div>
  );
}

