"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OrgContextObject = {
  id: string;
  type: string;
  title: string;
  summary: string;
  tags: string[];
  relations: {
    type: string;
    sourceId: string;
    targetId: string;
    label?: string;
  }[];
  owner: string | null;
  status: string;
  updatedAt: string;
};

type OrgDevContextResponse = {
  ok: boolean;
  workspaceOrg: {
    root: OrgContextObject;
    items: OrgContextObject[];
    count: number;
  };
};

type OrgDevSyncResponse = {
  ok: boolean;
  workspaceId: string;
  totalItems: number;
  message: string;
};

export default function OrgDevContextPage() {
  const [data, setData] = useState<OrgDevContextResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  async function loadContext() {
    try {
      setLoading(true);
      const res = await fetch("/org/api/dev/context");

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      const json = (await res.json()) as OrgDevContextResponse;
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load org dev context");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContext();
  }, []);

  async function handleSyncClick() {
    try {
      setSyncing(true);
      setSyncError(null);
      setSyncMessage(null);

      const res = await fetch("/org/api/dev/context/sync", {
        method: "POST",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Sync failed with status ${res.status}`);
      }

      const json = (await res.json()) as OrgDevSyncResponse;

      if (!json.ok) {
        throw new Error(json.message || "Sync failed");
      }

      setSyncMessage(json.message || "Synced Org context to store.");
      setSyncError(null);

      // After a successful sync, reload the dev bundle to ensure it still looks correct.
      await loadContext();
    } catch (e: any) {
      setSyncError(e?.message ?? "Failed to sync Org context to store");
      setSyncMessage(null);
    } finally {
      setSyncing(false);
    }
  }

  const items = data?.workspaceOrg.items ?? [];
  const countByType: Record<string, number> = {};

  for (const item of items) {
    countByType[item.type] = (countByType[item.type] ?? 0) + 1;
  }

  const sampleItems = items.slice(0, 10);

  return (
    <div className="p-8 space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Org • Loopbrain Dev
        </p>
        <h1 className="text-3xl font-bold">Org Context Inspector</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          This view shows how Loopbrain will see your Org layer once fully
          wired. It reads the dev-only bundle from <code>/org/api/dev/context</code>.
          You can also sync this bundle into the global Context Store using the
          button below.
        </p>
      </header>

      <section className="rounded-lg border bg-background p-4 text-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-medium">Status</div>
          <div className="flex flex-col items-end gap-1 text-xs">
            {loading && (
              <div className="text-muted-foreground">Loading…</div>
            )}
            {!loading && error && (
              <div className="text-red-600">
                Error: {error}
              </div>
            )}
            {!loading && !error && data && (
              <div className="text-emerald-600">
                Loaded org context bundle.
              </div>
            )}
          </div>
        </div>

        {!loading && !error && data && (
          <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
            <div>
              <div>
                Root ID:{" "}
                <span className="font-mono">
                  {data.workspaceOrg.root.id}
                </span>
              </div>
              <div>
                Total items:{" "}
                <span className="font-mono">
                  {data.workspaceOrg.count}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={handleSyncClick}
                disabled={syncing || !!error}
                className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {syncing ? "Syncing…" : "Sync to Context Store"}
              </button>
              {syncMessage && (
                <div className="text-[11px] text-emerald-600 text-right">
                  {syncMessage}
                </div>
              )}
              {syncError && (
                <div className="text-[11px] text-red-600 text-right">
                  {syncError}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {!loading && !error && data && (
        <>
          <section className="rounded-lg border bg-background p-4 space-y-3">
            <div className="text-sm font-medium">By type</div>
            {items.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                No Org context items found. Make sure departments, teams,
                positions, and people exist for this workspace.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                {Object.entries(countByType).map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2"
                  >
                    <span className="font-mono">{type}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border bg-background p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Sample items (first 10)</span>
              <span className="text-xs text-muted-foreground">
                Use your browser devtools or <code>/org/api/dev/context</code> for full JSON.
              </span>
            </div>
            {sampleItems.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                Nothing to show yet.
              </div>
            ) : (
              <div className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs font-mono">
                {sampleItems.map((item) => (
                  <div
                    key={item.id}
                    className="mb-3 border-b border-border pb-2 last:mb-0 last:border-none last:pb-0"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-semibold">{item.title}</span>
                      <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide">
                        {item.type}
                      </span>
                    </div>
                    <div className="mb-1 text-[11px] text-muted-foreground">
                      {item.summary}
                    </div>
                    <div className="mb-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-background px-1.5 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {item.relations.length > 0 && (
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        Relations:{" "}
                        {item.relations
                          .slice(0, 5)
                          .map((rel) => `${rel.type}(${rel.targetId})`)
                          .join(", ")}
                        {item.relations.length > 5 ? ", …" : ""}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/org"
          className="inline-flex text-primary hover:underline"
        >
          ← Back to Org overview
        </Link>
        <Link
          href="/org/departments"
          className="inline-flex text-muted-foreground hover:underline"
        >
          View departments →
        </Link>
        <Link
          href="/org/teams"
          className="inline-flex text-muted-foreground hover:underline"
        >
          View teams →
        </Link>
        <Link
          href="/org/positions"
          className="inline-flex text-muted-foreground hover:underline"
        >
          View positions →
        </Link>
        <Link
          href="/org/people"
          className="inline-flex text-muted-foreground hover:underline"
        >
          View people →
        </Link>
      </div>
    </div>
  );
}
