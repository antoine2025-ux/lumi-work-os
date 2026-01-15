"use client";

import React, { useMemo, useState } from "react";

export default function CycleRepairModal(props: {
  orgId: string;
  validation: any | null;
  people: { id: string; name: string }[];
  onClose: () => void;
  onApplied: () => Promise<void>;
}) {
  const cycleMembers = props.validation?.cycleMembers || [];
  const [personId, setPersonId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [newManagerId, setNewManagerId] = useState<string>("__CLEAR__");
  const [saving, setSaving] = useState(false);

  const members = useMemo(() => {
    const base = cycleMembers as { id: string; name: string }[];
    if (!query.trim()) return base.slice(0, 50);
    const q = query.trim().toLowerCase();
    return base.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 50);
  }, [cycleMembers, query]);

  const managerCandidates = useMemo(() => {
    const base = props.people.filter((p) => p.id !== personId);
    return base.slice(0, 100);
  }, [props.people, personId]);

  async function apply() {
    if (!personId) return;

    setSaving(true);
    try {
      const res = await fetch("/api/org/people/manager/edge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: props.orgId,
          personId,
          newManagerId: newManagerId === "__CLEAR__" ? null : newManagerId,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        alert(json?.error?.message || "Failed to update reporting edge");
        return;
      }
      await props.onApplied();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={props.onClose}>
      <div
        className="w-full max-w-2xl rounded-3xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold">Repair cycle</div>
            <div className="mt-1 text-sm text-black/50 dark:text-white/50">
              Break one reporting edge to remove the cycle.
            </div>
          </div>
          <button
            onClick={props.onClose}
            className="rounded-lg border border-black/10 px-2 py-1 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="text-sm font-medium">Choose a person in a cycle</div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cycle members…"
              className="mt-3 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-white/10"
              autoFocus
            />
            <div className="mt-3 max-h-64 space-y-1 overflow-auto rounded-2xl border border-black/10 bg-white/60 p-2 dark:border-white/10 dark:bg-white/5">
              {members.length === 0 ? (
                <div className="px-3 py-2 text-sm text-black/50 dark:text-white/50">No cycle members found</div>
              ) : (
                members.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPersonId(p.id)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white dark:hover:bg-white/10 ${
                      personId === p.id ? "bg-black text-white dark:bg-white dark:text-black" : ""
                    }`}
                  >
                    {p.name}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="text-sm font-medium">Set a new manager</div>
            <div className="mt-1 text-xs text-black/50 dark:text-white/50">
              You can clear manager or reattach to a valid manager outside the cycle.
            </div>

            <select
              value={newManagerId}
              onChange={(e) => setNewManagerId(e.target.value)}
              className="mt-3 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-white/10"
              disabled={!personId}
            >
              <option value="__CLEAR__">Clear manager (make top-level)</option>
              {managerCandidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <div className="mt-3 rounded-2xl border border-amber-400/40 bg-amber-50/60 p-3 text-sm text-black/70 dark:border-amber-300/30 dark:bg-amber-900/20 dark:text-white/70">
              This will change reporting line for 1 person. Confirm after applying that cycle count becomes 0.
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={props.onClose}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                disabled={!personId || saving}
                onClick={apply}
                className="rounded-xl bg-black px-3 py-2 text-sm text-white disabled:opacity-50 hover:opacity-90 dark:bg-white dark:text-black"
              >
                {saving ? "Applying..." : "Apply repair"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-black/40 dark:text-white/40">
          Tip: If cycles remain, repeat by breaking another edge. Cycles can involve more than 2 people.
        </div>
      </div>
    </div>
  );
}

