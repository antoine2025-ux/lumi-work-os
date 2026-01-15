"use client";

import React from "react";

export function RoleCard({
  role,
  onEdit,
}: {
  role: {
    name: string;
    responsibilities: { scope: string; target: string }[];
  };
  onEdit: () => void;
}) {
  const counts = {
    OWNERSHIP: role.responsibilities.filter((r) => r.scope === "OWNERSHIP").length,
    DECISION: role.responsibilities.filter((r) => r.scope === "DECISION").length,
    EXECUTION: role.responsibilities.filter((r) => r.scope === "EXECUTION").length,
  };

  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{role.name}</div>
        <button
          onClick={onEdit}
          className="text-xs underline text-black/50 hover:text-black/70 dark:text-white/50 dark:hover:text-white/70"
        >
          Edit
        </button>
      </div>

      <div className="mt-2 text-xs text-black/50 dark:text-white/50">
        Owns: {counts.OWNERSHIP} · Decides: {counts.DECISION} · Executes: {counts.EXECUTION}
      </div>
    </div>
  );
}

