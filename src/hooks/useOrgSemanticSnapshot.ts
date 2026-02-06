/**
 * useOrgSemanticSnapshot – client hook for /api/org/snapshot
 *
 * Returns OrgSemanticSnapshotV0 for Loopbrain/readiness UI consumption.
 * Snapshot is a machine contract; UI must display only, never reinterpret.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type { OrgSemanticSnapshotV0 } from "@/lib/org/snapshot/types";

export function useOrgSemanticSnapshot() {
  const [data, setData] = useState<OrgSemanticSnapshotV0 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshot = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/org/snapshot", {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Failed to load org snapshot (${res.status})`);
      }

      const json = await res.json();
      if (!json?.ok || !json?.data) {
        throw new Error("Invalid snapshot response");
      }

      setData(json.data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  return { data, isLoading, error, refetch: fetchSnapshot };
}
