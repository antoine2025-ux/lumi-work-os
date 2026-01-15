"use client";

import React from "react";
import { FocusToggle } from "./FocusToggle";
import type { FocusMode } from "./focus";
import { focusCopy } from "./focus";

export function PeopleCommandBar({
  mode,
  focusMode,
  setFocusMode,
  query,
  setQuery,
  sort,
  setSort,
  canEdit,
  onPrimaryAction,
  children,
}: {
  mode: "people" | "issues";
  focusMode: FocusMode;
  setFocusMode: (m: FocusMode) => void;
  query: string;
  setQuery: (v: string) => void;
  sort: string;
  setSort: (v: string) => void;
  canEdit: boolean;
  onPrimaryAction: () => void;
  children?: React.ReactNode; // slot for filters chips, saved views, etc.
}) {
  const showBulkAffordances = focusMode === "fix";
  const primaryCtaLabel = focusCopy[focusMode].primaryCta;

  return (
    <div className="sticky top-3 z-20 mb-4 rounded-2xl border border-black/10 bg-white/70 p-3 backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <FocusToggle mode={focusMode} setMode={setFocusMode} />
          <div className="relative min-w-0 flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === "people" ? "Search people by name, role, team…" : "Search issues by person/team…"}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white/80 dark:placeholder:text-white/30 dark:focus:ring-white/20"
            />
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:focus:ring-white/20 sm:w-[180px]"
          >
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
            <option value="team_asc">Team A–Z</option>
            <option value="aging_desc">Aging (issues)</option>
          </select>
        </div>

        <div className="flex items-center justify-between gap-2 lg:justify-end">
          <div className="hidden lg:block">{children}</div>

          <button
            type="button"
            disabled={!canEdit && mode === "issues"}
            onClick={onPrimaryAction}
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-black/30 disabled:bg-black/10 disabled:text-black/40 dark:bg-white dark:text-black dark:focus:ring-white/30 dark:disabled:bg-white/10 dark:disabled:text-white/40"
          >
            {primaryCtaLabel}
          </button>
        </div>

        <div className="lg:hidden">{children}</div>
      </div>
    </div>
  );
}

