"use client";

import React, { useEffect, useMemo, useState } from "react";

type Detail = {
  ok: boolean;
  rootKey: string;
  members: Array<{
    id: string;
    name: string;
    teamName: string | null;
    roleName: string | null;
    managerId: string | null;
    managerName: string | null;
  }>;
  invalidEdges: Array<{ id: string; name: string; managerId: string }>;
  error?: { code: string; message: string };
};

export default function OrphanRepairModal(props: {
  orgId: string;
  rootKey: string;
  people: { id: string; name: string }[];
  onClose: () => void;
  onApplied: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [query, setQuery] = useState("");
  const [managerId, setManagerId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/org/people/structure/detail?orgId=${encodeURIComponent(props.orgId)}&rootKey=${encodeURIComponent(
            props.rootKey
          )}`
        );
        const json = (await res.json().catch(() => null)) as Detail | null;
        if (!alive) return;
        setDetail(json);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [props.orgId, props.rootKey]);

  const candidates = useMemo(() => {
    const base = props.people.filter((p) => !detail?.members?.some((m) => m.id === p.id));
    if (!query.trim()) return base.slice(0, 50);
    const q = query.trim().toLowerCase();
    return base.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 50);
  }, [props.people, detail, query]);

  const memberCount = detail?.members?.length || 0;

  async function apply() {
    if (!detail?.ok) return;
    if (!managerId) return;

    setSaving(true);
    try {
      // Apply manager to all cluster members (safe baseline for orphan repair)
      const res = await fetch("/api/org/people/manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: props.orgId,
          personIds: detail.members.map((m) => m.id),
          managerId,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        alert(json?.error?.message || "Failed to apply manager");
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
            <div className="text-base font-semibold">Repair orphan cluster</div>
            <div className="mt-1 text-sm text-black/50 dark:text-white/50">
              {loading ? "Loading…" : `${memberCount} people in this disconnected cluster.`}
            </div>
          </div>
          <button
            onClick={props.onClose}
            className="rounded-lg border border-black/10 px-2 py-1 text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_360px]">
          {/* Members */}
          <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="text-sm font-medium">Cluster members</div>
            <div className="mt-1 text-xs text-black/50 dark:text-white/50">
              These people are not connected to a valid top-level leader.
            </div>

            {loading ? (
              <div className="mt-3 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-8 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                ))}
              </div>
            ) : detail?.ok ? (
              <div className="mt-3 max-h-72 space-y-2 overflow-auto">
                {detail.members.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="font-medium">{m.name}</div>
                    <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                      {m.roleName || "Role not set"}
                      {m.teamName ? ` · ${m.teamName}` : ""} · Manager: {m.managerName || "Invalid / not set"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-sm text-red-500">{detail?.error?.message || "Failed to load"}</div>
            )}
          </div>

          {/* Repair action */}
          <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="text-sm font-medium">Choose a root manager</div>
            <div className="mt-1 text-xs text-black/50 dark:text-white/50">
              This will assign the selected manager to all people in the orphan cluster.
            </div>

            <div className="mt-3 space-y-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search manager…"
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-white/10"
                autoFocus
              />

              <div className="max-h-56 space-y-1 overflow-auto rounded-2xl border border-black/10 bg-white/60 p-2 dark:border-white/10 dark:bg-white/5">
                {candidates.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-black/50 dark:text-white/50">No matches found</div>
                ) : (
                  candidates.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setManagerId(p.id)}
                      className={`w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white dark:hover:bg-white/10 ${
                        managerId === p.id ? "bg-black text-white dark:bg-white dark:text-black" : ""
                      }`}
                    >
                      {p.name}
                    </button>
                  ))
                )}
              </div>

              <div className="rounded-2xl border border-amber-400/40 bg-amber-50/60 p-3 text-sm text-black/70 dark:border-amber-300/30 dark:bg-amber-900/20 dark:text-white/70">
                Scope: updates manager for {memberCount} people.
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={props.onClose}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  disabled={!managerId || saving}
                  onClick={apply}
                  className="rounded-xl bg-black px-3 py-2 text-sm text-white disabled:opacity-50 hover:opacity-90 dark:bg-white dark:text-black"
                >
                  {saving ? "Applying..." : "Apply repair"}
                </button>
              </div>

              <div className="text-xs text-black/40 dark:text-white/40">
                After applying, mini-map will recompute and the orphan cluster should disappear (unless deeper anomalies
                remain).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

