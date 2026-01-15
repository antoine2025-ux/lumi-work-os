"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type Validation = {
  ok: boolean;
  totals: {
    people: number;
    invalidManagerEdges: number;
    cycleMembers: number;
    topLevel: number;
  };
};

export default function OrgUtilitiesPanel(props: { onClose: () => void; orgId: string | null }) {
  const pathname = usePathname();
  const [validation, setValidation] = useState<Validation | null>(null);

  useEffect(() => {
    let alive = true;
    async function loadValidation() {
      if (!props.orgId) return;
      const res = await fetch(`/api/org/people/structure/validate?orgId=${encodeURIComponent(props.orgId)}`);
      const json = await res.json().catch(() => null);
      if (!alive) return;
      if (!res.ok || !json?.ok) return;
      setValidation(json);
    }
    loadValidation();
    return () => {
      alive = false;
    };
  }, [props.orgId]);

  const contextLabel = useMemo(() => {
    if (pathname.startsWith("/org/people")) return "People";
    if (pathname.startsWith("/org/chart")) return "Org Chart";
    if (pathname.startsWith("/org/projects")) return "Projects";
    return "Overview";
  }, [pathname]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/20 p-4" onClick={props.onClose}>
      <div
        className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-white/[0.03]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-black/90 dark:text-white/90">Utilities</div>
            <div className="mt-1 text-sm text-black/50 dark:text-white/50">
              Org-wide tools · Context: {contextLabel}
            </div>
          </div>
          <button
            onClick={props.onClose}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-black/70 hover:bg-white/10 hover:text-black/90 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white/90"
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <Card title="Quick links">
            <div className="flex flex-col gap-2">
              <a
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-black/70 hover:bg-white/10 hover:text-black/90 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white/90"
                href="/org/people?mode=fix&focus=validation"
              >
                Repair structure in People →
              </a>
              <a
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-black/70 hover:bg-white/10 hover:text-black/90 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white/90"
                href="/org/chart"
              >
                Open Org Chart →
              </a>
            </div>
          </Card>

          <Card title="Structure validation">
            {!props.orgId ? (
              <div className="text-sm text-black/50 dark:text-white/50">
                No organization found. Create an org to enable validation.
              </div>
            ) : !validation ? (
              <div className="text-sm text-black/50 dark:text-white/50">Loading validation…</div>
            ) : (
              <div className="space-y-2 text-sm">
                <Line k="Invalid manager refs" v={String(validation.totals.invalidManagerEdges)} />
                <Line k="Cycle members" v={String(validation.totals.cycleMembers)} />
                <Line k="Top-level leaders" v={String(validation.totals.topLevel)} />
              </div>
            )}
          </Card>

          <Card title="Export">
            {!props.orgId ? (
              <div className="text-sm text-black/50 dark:text-white/50">
                No organization found. Create an org to enable export.
              </div>
            ) : (
              <a
                className="inline-flex w-full items-center justify-center rounded-xl bg-black px-3 py-2 text-sm text-white hover:opacity-90 dark:bg-white dark:text-black"
                href={`/api/org/people/export?orgId=${encodeURIComponent(props.orgId)}`}
              >
                Export People CSV
              </a>
            )}
          </Card>

          <div className="text-xs text-black/40 dark:text-white/40">
            This panel is standardized across Org tabs.
          </div>
        </div>
      </div>
    </div>
  );
}

function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="text-sm font-medium text-black/90 dark:text-white/90">{props.title}</div>
      <div className="mt-2">{props.children}</div>
    </div>
  );
}

function Line(props: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="text-sm text-black/60 dark:text-white/60">{props.k}</div>
      <div className="text-sm text-black/80 dark:text-white/80">{props.v}</div>
    </div>
  );
}
