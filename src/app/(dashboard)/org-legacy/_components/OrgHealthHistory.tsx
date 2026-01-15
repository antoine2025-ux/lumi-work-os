"use client";

import React, { useEffect, useState } from "react";

export function OrgHealthHistory() {
  const [days, setDays] = useState(30);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/org/health?mode=history&days=${days}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({} as any));
    if (data?.ok) setHistory(data.history || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [days]);

  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Completeness timeline</div>
        <select
          value={String(days)}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black"
        >
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
        </select>
      </div>

      <div className="mt-3 space-y-2">
        {loading ? (
          <div className="text-sm text-black/60 dark:text-white/60">Loading…</div>
        ) : history.length === 0 ? (
          <div className="text-sm text-black/60 dark:text-white/60">No history yet.</div>
        ) : (
          history
            .slice(-12)
            .reverse()
            .map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
              >
                <div className="text-black/70 dark:text-white/70">{new Date(h.createdAt).toLocaleString()}</div>
                <div className="font-semibold">{Math.round((h.score || 0) * 100)}%</div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

