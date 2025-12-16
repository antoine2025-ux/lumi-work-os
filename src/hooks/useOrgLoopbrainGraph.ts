// src/hooks/useOrgLoopbrainGraph.ts

import { useEffect, useState, useCallback } from "react";

export type OrgLoopbrainEntityType =
  | "org"
  | "department"
  | "team"
  | "role"
  | "person";

export interface OrgLoopbrainRelation {
  type: string;
  sourceId: string;
  targetId: string;
  label: string;
}

export interface OrgLoopbrainContextObject {
  id: string;
  type: OrgLoopbrainEntityType;
  title: string;
  summary: string;
  tags: string[];
  relations: OrgLoopbrainRelation[];
  owner: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  updatedAt: string;
}

export interface OrgLoopbrainContextBundle {
  primary: OrgLoopbrainContextObject | null;
  related: OrgLoopbrainContextObject[];
  byId: Record<string, OrgLoopbrainContextObject>;
}

interface ApiResponse {
  ok: boolean;
  bundle?: OrgLoopbrainContextBundle;
  error?: string;
  detail?: string;
}

interface UseOrgLoopbrainGraphState {
  loading: boolean;
  error: string | null;
  bundle: OrgLoopbrainContextBundle | null;
}

export function useOrgLoopbrainGraph() {
  const [state, setState] = useState<UseOrgLoopbrainGraphState>({
    loading: false,
    error: null,
    bundle: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch("/dev/loopbrain/org-graph", {
        method: "GET",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Failed to load org graph: ${res.status} ${text}`
        );
      }

      const json: ApiResponse = await res.json();

      if (!json.ok || !json.bundle) {
        throw new Error(
          json.error ||
            json.detail ||
            "Unknown error loading org graph"
        );
      }

      setState({
        loading: false,
        error: null,
        bundle: json.bundle,
      });
    } catch (err: any) {
      console.error("useOrgLoopbrainGraph error:", err);
      setState({
        loading: false,
        error: err?.message || "Unknown error",
        bundle: null,
      });
    }
  }, []);

  useEffect(() => {
    // auto-load on mount
    load();
  }, [load]);

  return {
    ...state,
    reload: load,
  };
}

