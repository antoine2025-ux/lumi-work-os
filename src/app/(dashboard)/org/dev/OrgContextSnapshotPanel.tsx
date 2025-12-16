"use client";

import { useEffect, useState } from "react";

type OrgContextSnapshotResponse =
  | {
      ok: true;
      workspaceId: string;
      total: number;
      counts: {
        person?: number;
        team?: number;
        department?: number;
        role?: number;
        org?: number;
        [key: string]: number | undefined;
      };
      latestUpdatedAt: string | null;
    }
  | {
      ok: false;
      error: string;
    };

export function OrgContextSnapshotPanel() {
  const [data, setData] = useState<OrgContextSnapshotResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSnapshot() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/dev/org-loopbrain/context-snapshot");
        const json: OrgContextSnapshotResponse = await res.json();

        if (!res.ok || !("ok" in json) || !json.ok) {
          if (!cancelled) {
            setError(
              (json as any).error ??
                "Failed to load Org context snapshot. This is only available in non-production environments."
            );
          }
          return;
        }

        if (!cancelled) {
          setData(json);
        }
      } catch (e) {
        console.error("[OrgContextSnapshotPanel] Failed to fetch snapshot", e);
        if (!cancelled) {
          setError(
            "Failed to load Org context snapshot. This is only available in non-production environments."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchSnapshot();

    return () => {
      cancelled = true;
    };
  }, []);

  const snapshot = data && "ok" in data && data.ok ? data : null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-muted/40 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-medium">Org context snapshot (ContextItems)</div>
          <div className="text-[11px] text-muted-foreground">
            How Loopbrain currently sees your Org: people, teams, departments, roles.
          </div>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          Dev-only
        </span>
      </div>

      {loading && (
        <div className="mt-2 text-[11px] text-muted-foreground">
          Loading Org context snapshot…
        </div>
      )}

      {!loading && error && (
        <div className="mt-2 rounded-xl bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && snapshot && (
        <>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <SnapshotStat
              label="Total Org context items"
              value={snapshot.total}
              hint="All Org-related ContextItems"
            />
            <SnapshotStat
              label="People"
              value={snapshot.counts.person ?? 0}
              hint="type: person"
            />
            <SnapshotStat
              label="Teams"
              value={snapshot.counts.team ?? 0}
              hint="type: team"
            />
            <SnapshotStat
              label="Departments"
              value={snapshot.counts.department ?? 0}
              hint="type: department"
            />
            <SnapshotStat
              label="Roles"
              value={snapshot.counts.role ?? 0}
              hint="type: role"
            />
            <SnapshotStat
              label="Org root objects"
              value={snapshot.counts.org ?? 0}
              hint="type: org"
            />
          </div>

          <div className="mt-2 text-[10px] text-muted-foreground">
            Last Org context update:{" "}
            <span className="font-medium">
              {snapshot.latestUpdatedAt
                ? new Date(snapshot.latestUpdatedAt).toLocaleString()
                : "No Org context items found"}
            </span>
          </div>

          <div className="mt-1 text-[10px] text-muted-foreground">
            Tip: Compare these numbers with your Org overview (headcount, teams,
            departments, roles). If they drift, the Org → ContextItem pipeline may
            need attention.
          </div>
        </>
      )}

      {!loading && !error && !snapshot && (
        <div className="mt-2 text-[11px] text-muted-foreground">
          No Org context snapshot available.
        </div>
      )}
    </div>
  );
}

type SnapshotStatProps = {
  label: string;
  value: number;
  hint?: string;
};

function SnapshotStat({ label, value, hint }: SnapshotStatProps) {
  return (
    <div className="flex flex-col rounded-xl bg-background/70 px-2 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-base font-semibold">{value}</div>
      {hint && (
        <div className="text-[10px] text-muted-foreground">
          {hint}
        </div>
      )}
    </div>
  );
}

