"use client";

import React, { useMemo, useState } from "react";

export default function ManagerPickerModal(props: {
  orgId: string;
  people: { id: string; name: string }[];
  excludeIds: string[];
  count: number;
  onClose: () => void;
  onApply: (managerIdOrNull: string | null) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [applying, setApplying] = useState(false);

  const candidates = useMemo(() => {
    const base = props.people.filter((p) => !props.excludeIds.includes(p.id));
    if (!query.trim()) return base.slice(0, 50);
    const q = query.trim().toLowerCase();
    return base.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 50);
  }, [props.people, props.excludeIds, query]);

  const needsConfirm = props.count >= 4;

  async function handleApply() {
    setApplying(true);
    try {
      await props.onApply(selectedManagerId === "__CLEAR__" ? null : selectedManagerId);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={props.onClose}>
      <div
        className="w-full max-w-lg rounded-3xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold">Set manager</div>
            <div className="mt-1 text-sm text-black/50 dark:text-white/50">
              Apply to {props.count} selected {props.count === 1 ? "person" : "people"}.
            </div>
          </div>
          <button
            onClick={props.onClose}
            className="rounded-lg border border-black/10 px-2 py-1 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search managers…"
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-white/10"
            autoFocus
          />

          <div className="rounded-2xl border border-black/10 bg-white/60 p-2 dark:border-white/10 dark:bg-white/5">
            <button
              onClick={() => setSelectedManagerId("__CLEAR__")}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white dark:hover:bg-white/10 ${
                selectedManagerId === "__CLEAR__" ? "bg-black text-white dark:bg-white dark:text-black" : ""
              }`}
            >
              Clear manager
            </button>

            <div className="my-2 border-t border-black/10 dark:border-white/10" />

            <div className="max-h-64 space-y-1 overflow-auto">
              {candidates.length === 0 ? (
                <div className="px-3 py-2 text-sm text-black/50 dark:text-white/50">No matches found</div>
              ) : (
                candidates.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedManagerId(p.id)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white dark:hover:bg-white/10 ${
                      selectedManagerId === p.id ? "bg-black text-white dark:bg-white dark:text-black" : ""
                    }`}
                  >
                    {p.name}
                  </button>
                ))
              )}
            </div>
          </div>

          {needsConfirm ? (
            <div className="rounded-2xl border border-amber-400/40 bg-amber-50/60 p-3 text-sm text-black/70 dark:border-amber-300/30 dark:bg-amber-900/20 dark:text-white/70">
              This will update manager for {props.count} people. Review selection before applying.
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={props.onClose}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              disabled={!selectedManagerId || applying}
              onClick={handleApply}
              className="rounded-xl bg-black px-3 py-2 text-sm text-white disabled:opacity-50 hover:opacity-90 dark:bg-white dark:text-black"
            >
              {applying ? "Applying..." : "Apply"}
            </button>
          </div>

          <div className="text-xs text-black/40 dark:text-white/40">
            Tip: Use the mini-map to spot orphan clusters and top-level leaders after applying.
          </div>
        </div>
      </div>
    </div>
  );
}

