"use client";

import React, { useEffect, useState } from "react";

type Merge = {
  id: string;
  canonicalId: string;
  mergedId: string;
  appliedAt: string;
  undoneAt: string | null;
  actorLabel: string;
};

export function MergeReviewPanel({ canEdit }: { canEdit: boolean }) {
  const [merges, setMerges] = useState<Merge[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    const res = await fetch("/api/org/merges", { cache: "no-store" });
    const data = await res.json().catch(() => ({} as any));
    if (data?.ok) setMerges(data.merges || []);
  }

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("merges-updated", handler);
    return () => window.removeEventListener("merges-updated", handler);
  }, []);

  async function undo(id: string) {
    const res = await fetch("/api/org/duplicates/undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mergeLogId: id }),
    });
    if (res.ok) {
      await load();
      // Trigger reload of duplicates and merges in parent
      window.dispatchEvent(new Event("merges-updated"));
    }
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-black/90 dark:text-white/90">
            Merge review
          </div>
          <div className="mt-1 text-xs text-black/50 dark:text-white/50">
            History of duplicate merges (undo available).
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl px-3 py-2 text-sm font-medium text-black/70 hover:bg-black/5 hover:text-black focus:outline-none focus:ring-2 focus:ring-black/20 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white dark:focus:ring-white/20"
        >
          {open ? "Collapse" : "Expand"}
        </button>
      </div>

      {open ? (
        <div className="mt-3 space-y-2">
          {merges.length === 0 ? (
            <div className="text-sm text-black/60 dark:text-white/60">
              No merges yet.
            </div>
          ) : (
            merges.slice(0, 12).map((m) => (
              <div key={m.id} className="rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-black/90 dark:text-white/90">
                      {m.mergedId} → {m.canonicalId}
                    </div>
                    <div className="mt-0.5 text-xs text-black/50 dark:text-white/50">
                      by {m.actorLabel} · {new Date(m.appliedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {m.undoneAt ? (
                      <span className="rounded-full border border-black/10 bg-black/5 px-2 py-1 text-xs text-black/60 dark:border-white/10 dark:bg-white/10 dark:text-white/60">
                        Undone
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => undo(m.id)}
                        className="rounded-xl border border-black/10 px-3 py-2 text-sm disabled:text-black/40 dark:border-white/10 dark:disabled:text-white/40"
                      >
                        Undo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="mt-3 text-sm text-black/60 dark:text-white/60">
          Collapsed to avoid competing with triage.
        </div>
      )}
    </div>
  );
}

