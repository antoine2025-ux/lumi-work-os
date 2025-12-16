"use client";

import React, { useEffect, useState } from "react";
import { SettingsNav } from "../_components/SettingsNav";

type Archived = {
  id: string;
  name: string | null;
  email: string | null;
  archivedAt: string;
  archivedReason: string | null;
  mergedIntoId: string | null;
};

export default function ArchivedPeoplePage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Archived[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"VIEWER" | "EDITOR" | "ADMIN">("VIEWER");

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (q.trim()) qs.set("q", q.trim());
    const res = await fetch(`/api/org/people/archived?${qs.toString()}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({} as any));
    if (data?.ok) setRows(data.people || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    (async () => {
      const res = await fetch("/api/org/permissions");
      const data = await res.json().catch(() => ({} as any));
      if (data?.ok) setUserRole(data.role);
    })();
  }, []);

  async function restore(id: string) {
    if (!confirm("Restore this archived person? They will reappear in People.")) return;
    const res = await fetch("/api/org/people/archived/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({} as any));
    if (data?.ok) await load();
  }

  return (
    <div className="px-6 py-6">
      <div className="max-w-4xl space-y-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <SettingsNav role={userRole} />
          </div>
          <div className="lg:col-span-3 space-y-6">
            <div>
              <h1 className="text-xl font-semibold">Archived people</h1>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                Compliance view. Archived records do not appear in People by default.
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") load();
                  }}
                  placeholder="Search name or email…"
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black"
                />
                <button
                  type="button"
                  onClick={load}
                  className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-black/10 text-xs text-black/50 dark:border-white/10 dark:text-white/50">
                  <tr>
                    <th className="px-4 py-3">Person</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Merged into</th>
                    <th className="px-4 py-3">Archived</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-black/60 dark:text-white/60">
                        Loading…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-black/60 dark:text-white/60">
                        No archived people found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="border-b border-black/5 last:border-b-0 dark:border-white/10">
                        <td className="px-4 py-3">
                          <div className="font-medium text-black/90 dark:text-white/90">{r.name || "Unnamed"}</div>
                          <div className="text-xs text-black/50 dark:text-white/50">{r.email || ""}</div>
                        </td>
                        <td className="px-4 py-3 text-black/70 dark:text-white/70">{r.archivedReason || "—"}</td>
                  <td className="px-4 py-3 text-black/70 dark:text-white/70">
                    {r.mergedIntoId ? (
                      <a
                        href={`/org/people?personId=${r.mergedIntoId}`}
                        className="text-xs font-mono text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {r.mergedIntoId}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-black/70 dark:text-white/70">
                    {new Date(r.archivedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      {r.mergedIntoId ? (
                        <a
                          href={`/org/people?personId=${r.mergedIntoId}`}
                          className="rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
                        >
                          Open canonical
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => restore(r.id)}
                        className="rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
                      >
                        Restore
                      </button>
                    </div>
                  </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

