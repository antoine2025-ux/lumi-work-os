"use client";

import React from "react";

export default function StructureValidationPanel(props: {
  validation: any | null;
  onRepairCycles: () => void;
}) {
  const v = props.validation;

  const items = v
    ? [
        {
          label: "Invalid manager references",
          value: v.totals.invalidManagerEdges,
          ok: v.totals.invalidManagerEdges === 0,
        },
        { label: "Cycle members detected", value: v.totals.cycleMembers, ok: v.totals.cycleMembers === 0 },
        { label: "Top-level leaders", value: v.totals.topLevel, ok: v.totals.topLevel >= 1 },
      ]
    : [];

  return (
    <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Structure validation</div>
          <div className="mt-1 text-xs text-black/50 dark:text-white/50">
            Integrity checklist — factual, recomputed from current data.
          </div>
        </div>
        {v?.totals?.cycleMembers > 0 ? (
          <button
            onClick={props.onRepairCycles}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
          >
            Repair cycles
          </button>
        ) : null}
      </div>

      {!v ? (
        <div className="mt-3 space-y-2">
          <div className="h-4 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="h-4 w-64 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          {items.map((it, i) => (
            <div
              key={i}
              className="rounded-2xl border border-black/10 bg-white/70 p-3 text-left dark:border-white/10 dark:bg-white/5"
            >
              <div className="text-xs text-black/50 dark:text-white/50">{it.label}</div>
              <div className="mt-1 text-lg font-semibold">{it.value}</div>
              <div className={`mt-1 text-xs ${it.ok ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                {it.ok ? "✓ OK" : "⚠ Needs attention"}
              </div>
            </div>
          ))}
        </div>
      )}

      {v?.totals?.cycleMembers > 0 ? (
        <div className="mt-3 text-xs text-black/40 dark:text-white/40">
          Cycles prevent reliable escalation paths and completeness scoring. Repair by breaking one reporting edge.
        </div>
      ) : null}
    </div>
  );
}

