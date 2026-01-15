import React from "react";

export type SortKey =
  | "nameAsc"
  | "nameDesc"
  | "teamAsc"
  | "teamDesc"
  | "issuesFirst"
  | "reportsDesc";

export function PeopleSearchSortBar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  showing,
  total,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  sort: SortKey;
  onSortChange: (k: SortKey) => void;
  showing: number;
  total: number;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-black/90 dark:text-white/90">
            Finder
          </div>
          <div className="mt-1 text-xs text-black/50 dark:text-white/50">
            Search and order people without losing structural context.
            {showing !== total ? (
              <span className="ml-2">
                Showing <span className="font-medium text-black/70 dark:text-white/70">{showing}</span> of {total}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by name, role, team…"
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 shadow-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white/80 dark:focus:ring-white/20"
        />

        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          className="w-full sm:w-[220px] rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 shadow-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white/80 dark:focus:ring-white/20"
        >
          <option value="issuesFirst">Issues first</option>
          <option value="reportsDesc">Managers (span)</option>
          <option value="nameAsc">Name A–Z</option>
          <option value="nameDesc">Name Z–A</option>
          <option value="teamAsc">Team A–Z</option>
          <option value="teamDesc">Team Z–A</option>
        </select>
      </div>
    </div>
  );
}

