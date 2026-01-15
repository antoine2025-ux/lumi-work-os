"use client";

import React, { useState } from "react";
import { useOrgLoopbrainChat } from "@/lib/hooks/useOrgLoopbrainChat";
import { LoopbrainLocation } from "@/lib/loopbrain/location";
import { useUserStatus } from "@/hooks/use-user-status";
import { OrgLoopbrainAnswer } from "./OrgLoopbrainAnswer";

type OrgPersonLoopbrainPanelProps = {
  personId: string;
  personName?: string;
};

export function OrgPersonLoopbrainPanel({
  personId,
  personName,
}: OrgPersonLoopbrainPanelProps) {
  const { userStatus } = useUserStatus();
  const workspaceId = userStatus?.workspaceId || "";
  const [question, setQuestion] = useState("");
  const { loading, error, answer, askOrgQuestion } = useOrgLoopbrainChat();

  const handleAsk = async () => {
    if (!workspaceId || !personId || !question.trim()) return;

    const location: LoopbrainLocation = {
      mode: "org",
      view: "org.person",
      workspaceId,
      personId,
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
          Ask Loopbrain about {personName ?? "this person"}
        </h3>
        <p className="text-xs text-muted-foreground">
          Reporting lines, responsibilities, team context, and workload (based on Org data).
        </p>
      </div>

      <textarea
        className="min-h-[60px] w-full rounded-md border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        placeholder="e.g. Who does this person report to? What do they own?"
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

