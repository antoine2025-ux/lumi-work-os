/**
 * useOrgLoopbrainChat Hook
 * 
 * React hook for calling Loopbrain in org mode.
 * Uses the unified /api/loopbrain/chat endpoint with mode="org".
 */

"use client";

import { useState } from "react";
import type { LoopbrainLocation } from "@/lib/loopbrain/location";
import type { LoopbrainResponse } from "@/lib/loopbrain/orchestrator-types";

type OrgChatState = {
  loading: boolean;
  error: string | null;
  answer: string | null;
  response: LoopbrainResponse | null;
};

export function useOrgLoopbrainChat() {
  const [state, setState] = useState<OrgChatState>({
    loading: false,
    error: null,
    answer: null,
    response: null,
  });

  const askOrgQuestion = async (params: {
    workspaceId: string;
    question: string;
    location?: LoopbrainLocation;
    personId?: string;
    teamId?: string;
    departmentId?: string;
    positionId?: string;
  }) => {
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const res = await fetch("/api/loopbrain/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "org",
          query: params.question,
          personId: params.personId || params.location?.personId,
          teamId: params.teamId || params.location?.teamId,
          departmentId: params.departmentId || params.location?.departmentId,
          roleId: params.positionId || params.location?.positionId,
          useSemanticSearch: true,
          maxContextItems: 10,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState({
          loading: false,
          error: data.error || "Org Loopbrain request failed",
          answer: null,
          response: null,
        });
        return;
      }

      const response = data as LoopbrainResponse;

      setState({
        loading: false,
        error: null,
        answer: response.answer || null,
        response,
      });
    } catch (error: unknown) {
      console.error("[useOrgLoopbrainChat] error:", error);
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Unexpected error while calling Org Loopbrain",
        answer: null,
        response: null,
      });
    }
  };

  return {
    loading: state.loading,
    error: state.error,
    answer: state.answer,
    response: state.response,
    askOrgQuestion,
  };
}

