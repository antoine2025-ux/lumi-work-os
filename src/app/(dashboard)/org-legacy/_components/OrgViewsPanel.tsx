"use client";

import React, { useEffect, useState } from "react";

type View = {
  id: string;
  key: string;
  title: string;
  description?: string;
  persona: string;
  config: any;
};

export function OrgViewsPanel() {
  const [views, setViews] = useState<View[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/org/views", { cache: "no-store" });
    const data = await res.json().catch(() => ({} as any));
    if (data?.ok) setViews(data.views || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="mb-4 rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm text-black/60 dark:text-white/60">Loading views…</div>
      </div>
    );
  }

  if (!views.length) return null;

  return (
    <div className="mb-4 rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="mb-3">
        <div className="text-sm font-semibold text-black/90 dark:text-white/90">Saved views</div>
        <div className="mt-1 text-xs text-black/50 dark:text-white/50">
          Curated perspectives for leadership and operations.
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {views.map((v) => (
          <a
            key={v.id}
            href={`/org/people?tab=issues&view=${v.key}`}
            className="group rounded-2xl border border-black/10 bg-white/70 p-4 text-sm transition-colors hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <div className="font-semibold text-black/90 dark:text-white/90">{v.title}</div>
            {v.description ? (
              <div className="mt-0.5 text-xs text-black/50 dark:text-white/50">{v.description}</div>
            ) : null}
          </a>
        ))}
      </div>
    </div>
  );
}

