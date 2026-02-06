/**
 * useOrgIssuesSummary – client hook for /api/org/issues/summary
 *
 * Returns issue counts (total, by severity, by category) and top issues
 * from the canonical pipeline. Used by Overview and Intelligence.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";
import type { IntelligenceSummaries } from "@/lib/org/intelligence/types";

export type OrgIssuesSummaryData = {
  total: number;
  countsBySeverity: { error: number; warning: number; info: number };
  summaries: IntelligenceSummaries;
  topIssues: OrgIssueMetadata[];
};

export function useOrgIssuesSummary() {
  const [data, setData] = useState<OrgIssuesSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/org/issues/summary", {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Failed to load issues summary (${res.status})`);
      }

      const json = await res.json();

      // Handle both flat shape { ok, total, ... } and envelope { ok, data: { total, ... } }
      const payload = json?.data ?? json;

      setData({
        total: payload.total ?? 0,
        countsBySeverity: payload.countsBySeverity ?? { error: 0, warning: 0, info: 0 },
        summaries: payload.summaries ?? null,
        topIssues: payload.topIssues ?? [],
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { data, isLoading, error, refetch: fetchSummary };
}
