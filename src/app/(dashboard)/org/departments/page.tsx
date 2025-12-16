"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OrgDepartment = {
  id: string;
  name: string;
  description: string | null;
  teamCount: number | null;
  positionCount: number | null;
  createdAt: string;
};

type DepartmentsResponse =
  | { ok: true; departments: OrgDepartment[] }
  | { ok: false; error: string };

export default function OrgDepartmentsPage() {
  const [data, setData] = useState<OrgDepartment[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDepartments() {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch("/api/org/departments");
        const json = (await res.json()) as DepartmentsResponse;

        if (!res.ok || !("ok" in json) || !json.ok) {
          const message =
            "error" in json && json.error
              ? json.error
              : "Failed to load departments";
          if (!cancelled) setError(message);
          return;
        }

        if (!cancelled) {
          setData(json.departments);
        }
      } catch (err) {
        console.error("Error fetching departments:", err);
        if (!cancelled) {
          setError("Unexpected error while loading departments");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadDepartments();

    return () => {
      cancelled = true;
    };
  }, []);

  const hasDepartments = !!data && data.length > 0;

  return (
    <div className="p-8 space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Org • Structure
        </p>
        <h1 className="text-2xl font-semibold">Departments</h1>
        <p className="text-sm text-muted-foreground">
          High-level groups in your organization. Each department contains
          teams and positions.
        </p>
      </header>

      {/* Top actions / navigation */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 text-xs text-muted-foreground">
          <Link
            href="/org"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            ← Back to Org overview
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="mt-4">
        {isLoading && (
          <div className="rounded-md border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
            Loading departments…
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!isLoading && !error && !hasDepartments && (
          <div className="rounded-md border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
            No departments found yet. Once you start defining your org
            structure, departments will appear here.
          </div>
        )}

        {!isLoading && !error && hasDepartments && (
          <div className="overflow-hidden rounded-lg border bg-background">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Teams</th>
                  <th className="px-4 py-3 font-medium">Positions</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data!.map((dept) => (
                  <tr
                    key={dept.id}
                    className="border-t hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="space-y-0.5">
                        <div className="font-medium">{dept.name}</div>
                        {dept.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {dept.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-sm">
                      {dept.teamCount ?? "—"}
                    </td>
                    <td className="px-4 py-3 align-top text-sm">
                      {dept.positionCount ?? "—"}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                      {new Date(dept.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/org/teams?departmentId=${encodeURIComponent(dept.id)}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          View teams
                          <span aria-hidden="true">→</span>
                        </Link>
                        <Link
                          href={`/org/departments/${dept.id}`}
                          className="text-xs font-medium text-muted-foreground hover:text-primary hover:underline"
                        >
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
