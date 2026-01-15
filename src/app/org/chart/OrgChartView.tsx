"use client";

import * as React from "react";
import Link from "next/link";

type DepartmentRow = {
  id: string;
  name: string;
  teamsCount: number;
  peopleCount: number | null;
};

type OrgChartViewProps = {
  departments: DepartmentRow[];
};

export function OrgChartView({ departments }: OrgChartViewProps) {
  const [mode, setMode] = React.useState<"tree" | "list">("tree");
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departments;

    return departments.filter((d) => {
      return d.name.toLowerCase().includes(q);
    });
  }, [departments, query]);

  return (
    <section className="mt-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Organization structure
          </h2>
          <p className="mt-1 text-sm text-white/60">
            Departments, teams, and key leads at a glance.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setMode("list")}
            className={
              "rounded-full px-3 py-1.5 text-sm " +
              (mode === "list"
                ? "bg-white text-black"
                : "text-white/70 hover:text-white")
            }
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setMode("tree")}
            className={
              "rounded-full px-3 py-1.5 text-sm " +
              (mode === "tree"
                ? "bg-white text-black"
                : "text-white/70 hover:text-white")
            }
          >
            Tree
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <div className="flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <span className="text-white/40">🔎</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search departments..."
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
          <div className="text-base font-medium text-white">No departments found</div>
          <div className="mt-2 text-sm text-white/60">
            Try adjusting your search query.
          </div>
        </div>
      ) : mode === "tree" ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d) => {
            const href = `/org/chart/departments/${encodeURIComponent(d.id)}`;
            return (
              <Link
                key={d.id}
                href={href}
                className="block rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition-colors hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-white">{d.name}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/70">
                      {d.teamsCount} teams
                    </span>
                    {d.peopleCount !== null ? (
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/70">
                        {d.peopleCount} people
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <span className="text-sm text-white/70">
                    Open →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((d) => {
            const href = `/org/chart/departments/${encodeURIComponent(d.id)}`;
            return (
              <Link
                key={d.id}
                href={href}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 transition-colors hover:bg-white/[0.05]"
              >
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-white">
                    {d.name}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/70">
                    {d.teamsCount} teams
                  </span>
                  {d.peopleCount !== null ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/70">
                      {d.peopleCount} people
                    </span>
                  ) : null}
                  <span className="ml-2 text-sm text-white/70">
                    Open →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

