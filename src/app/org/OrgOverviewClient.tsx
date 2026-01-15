"use client";

import Link from "next/link";
import React from "react";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { OrgNoAccessState } from "@/components/org/OrgNoAccessState";
import { isOrgNoAccessError } from "@/lib/orgErrorUtils";
import { OrgOverviewStatsRibbon } from "@/components/org/overview/OrgOverviewStatsRibbon";
import type { OrgOverviewStats } from "@/lib/org/data.server";
import type { OrgInsightsSnapshot } from "@/lib/org/insights";

type OwnershipHealthResponse = {
  summary: {
    missingDepartmentLeads: number;
    missingTeamLeads: number;
    missingReportingLines: number;
    missingRole: number;
    missingTeam: number;
    orphanTeams: number;
  };
  examples: {
    departmentsMissingLead: Array<{ id: string; name: string }>;
    teamsMissingLead: Array<{ id: string; name: string; departmentName?: string | null }>;
    peopleMissingManager: Array<{ id: string; name: string; title?: string | null }>;
    peopleMissingRole: Array<{ id: string; name: string }>;
    peopleMissingTeam: Array<{ id: string; name: string }>;
    teamsMissingDepartment: Array<{ id: string; name: string }>;
  };
};

type CapacitySnapshotResponse = {
  meta: {
    lookaheadDays: number;
    asOf: string;
  };
  totals: {
    people: number;
    availableNow: number;
    unavailableNow: number;
    returningSoon: number;
    effectiveCapacityUnits: number;
  };
  byDepartment: Array<{
    id: string;
    name: string;
    people: number;
    availableNow: number;
    unavailableNow: number;
    returningSoon: number;
    effectiveCapacityUnits: number;
  }>;
  byRoleFamily: Array<{
    key: string;
    people: number;
    availableNow: number;
    effectiveCapacityUnits: number;
  }>;
  examples: {
    unavailableNow: Array<{ id: string; name: string; title?: string | null; returnsOn?: string | null }>;
    returningSoon: Array<{ id: string; name: string; title?: string | null; returnsOn?: string | null }>;
    availableNow: Array<{ id: string; name: string; title?: string | null }>;
  };
};

type OwnershipCoverageResponse = {
  totals: {
    people: number;
    positions: number;
    teams: number;
    departments: number;
    ownedPositions: number;
    unownedPositions: number;
    ownedTeams: number;
    unownedTeams: number;
    ownedDepartments: number;
    unownedDepartments: number;
  };
  unowned: {
    positions: Array<{ id: string; name: string; departmentName?: string | null; teamName?: string | null }>;
    teams: Array<{ id: string; name: string; departmentName?: string | null }>;
    departments: Array<{ id: string; name: string }>;
  };
};

type ManagementLoadResponse = {
  totals: {
    managers: number;
    totalReports: number;
    avgSpan: number;
    maxSpan: number;
    unassignedReports: number;
  };
  threshold: { overloadedSpan: number };
  topManagers: Array<{
    id: string;
    name: string;
    title?: string | null;
    departmentName?: string | null;
    directReports: number;
    isOverloaded: boolean;
  }>;
  orphans: Array<{ id: string; name: string; title?: string | null }>;
};

function PillLink(props: {
  href: string;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={props.href}
      className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/75 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
    >
      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/80">
        {props.count}
      </span>
      <span className="text-white/70 group-hover:text-white/90">{props.label}</span>
      <span className="text-white/35 group-hover:text-white/50">→</span>
    </Link>
  );
}

function NeedsAttentionStrip() {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<OwnershipHealthResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/org/health/ownership", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // Check if response is JSON before parsing
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Response is not JSON');
        }

        const json = (await res.json()) as OwnershipHealthResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("Couldn't load ownership health.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-3xl border border-white/5 bg-slate-900/80 shadow-[0_24px_80px_rgba(0,0,0,0.25)] p-6 md:p-7">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Needs attention</h2>
          <p className="mt-1 text-sm text-slate-400">
            Ownership gaps that can block decisions.
          </p>
        </div>
        <div className="text-xs text-slate-500">{loading ? "Scanning…" : "Updated"}</div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/65">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-44 animate-pulse rounded-full border border-white/10 bg-white/[0.03]"
            />
          ))}
        </div>
      ) : data ? (
        (() => {
          // Handle both old shape (summary) and new shape (totals) for backward compatibility
          const s = (data as any).summary || {
            missingDepartmentLeads: (data as any).totals?.unownedDepartments || 0,
            missingTeamLeads: (data as any).totals?.unownedTeams || 0,
            missingReportingLines: 0, // Not in new shape
            missingRole: 0, // Not in new shape
            missingTeam: 0, // Not in new shape
            orphanTeams: 0, // Not in new shape
          };
          const items: Array<{ key: string; count: number; label: string; href: string }> = [
            {
              key: "missing_department_lead",
              count: s.missingDepartmentLeads,
              label: "depts missing lead",
              href: "/org/structure?issue=missing_department_lead",
            },
            {
              key: "missing_team_lead",
              count: s.missingTeamLeads,
              label: "teams missing lead",
              href: "/org/people?mode=fix&issue=missing_team_lead",
            },
            {
              key: "missing_manager",
              count: s.missingReportingLines,
              label: "people missing manager",
              href: "/org/people?mode=fix&issue=missing_manager",
            },
            {
              key: "missing_role",
              count: s.missingRole,
              label: "people missing role",
              href: "/org/people?mode=fix&issue=missing_role",
            },
            {
              key: "missing_team",
              count: s.missingTeam,
              label: "people missing team",
              href: "/org/people?mode=fix&issue=missing_team",
            },
            {
              key: "orphan_team",
              count: s.orphanTeams,
              label: "teams missing department",
              href: "/org/structure?issue=orphan_team",
            },
          ];

          const visible = items.filter((i) => i.count > 0);

          if (visible.length === 0) {
            return (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/70">
                <span className="text-emerald-300/90">✓</span>
                <span>All clear — ownership looks consistent.</span>
              </div>
            );
          }

          return (
            <div className="mt-4 flex flex-wrap gap-2">
              {visible.map((i) => (
                <PillLink key={i.key} href={i.href} label={i.label} count={i.count} />
              ))}
            </div>
          );
        })()
      ) : null}
    </section>
  );
}

function CapacitySnapshotStrip() {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<CapacitySnapshotResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/org/health/capacity?lookaheadDays=14", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // Check if response is JSON before parsing
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Response is not JSON');
        }

        const json = (await res.json()) as CapacitySnapshotResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("Couldn't load capacity snapshot.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-3xl border border-white/5 bg-slate-900/80 shadow-[0_24px_80px_rgba(0,0,0,0.25)] p-6 md:p-7">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Capacity snapshot</h2>
          <p className="mt-1 text-sm text-slate-400">
            Availability and effective capacity (next 14 days)
          </p>
        </div>
        <div className="text-xs text-slate-500">{loading ? "Loading…" : "Updated"}</div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/65">
          Capacity snapshot unavailable — check Org data sources.
        </div>
      ) : loading ? (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
            />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Top 3 cards */}
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="text-xs text-slate-400">Available now</div>
              <div className="mt-1 text-2xl font-semibold text-slate-100">
                {data.totals.availableNow} <span className="text-sm font-normal text-slate-400">/ {data.totals.people}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="text-xs text-slate-400">Unavailable now</div>
              <div className="mt-1 text-2xl font-semibold text-slate-100">{data.totals.unavailableNow}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="text-xs text-slate-400">Effective capacity</div>
              <div className="mt-1 text-2xl font-semibold text-slate-100">
                {data.totals.effectiveCapacityUnits} <span className="text-sm font-normal text-slate-400">units</span>
              </div>
            </div>
          </div>

          {/* Department table (top 5) */}
          {data.byDepartment.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                By Department
              </div>
              <div className="space-y-2">
                {data.byDepartment.slice(0, 5).map((dept) => (
                  <div
                    key={dept.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-100">{dept.name}</div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        {dept.availableNow} available · {dept.effectiveCapacityUnits.toFixed(1)} units
                      </div>
                    </div>
                    <Link
                      href={`/org/people?mode=explore&dept=${dept.id}`}
                      className="ml-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
                    >
                      View people →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deep-link pills */}
          <div className="mt-6 flex flex-wrap gap-2">
            {data.totals.unavailableNow > 0 && (
              <Link
                href="/org/people?mode=explore&availability=unavailable"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/75 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
              >
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/80">
                  {data.totals.unavailableNow}
                </span>
                <span className="text-white/70 hover:text-white/90">Unavailable now</span>
                <span className="text-white/35">→</span>
              </Link>
            )}
            {data.totals.returningSoon > 0 && (
              <Link
                href="/org/people?mode=explore&availability=returning_soon"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/75 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
              >
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/80">
                  {data.totals.returningSoon}
                </span>
                <span className="text-white/70 hover:text-white/90">Returning soon</span>
                <span className="text-white/35">→</span>
              </Link>
            )}
            {data.totals.availableNow > 0 && (
              <Link
                href="/org/people?mode=explore&availability=available"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/75 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
              >
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/80">
                  {data.totals.availableNow}
                </span>
                <span className="text-white/70 hover:text-white/90">Available now</span>
                <span className="text-white/35">→</span>
              </Link>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}

function OwnershipManagementStrip() {
  const [loading, setLoading] = React.useState(true);
  const [ownershipData, setOwnershipData] = React.useState<OwnershipCoverageResponse | null>(null);
  const [managementData, setManagementData] = React.useState<ManagementLoadResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [ownershipRes, managementRes] = await Promise.all([
          fetch("/api/org/health/ownership", { cache: "no-store" }),
          fetch("/api/org/health/management-load", { cache: "no-store" }),
        ]);

        if (!ownershipRes.ok) throw new Error(`Ownership HTTP ${ownershipRes.status}`);
        if (!managementRes.ok) throw new Error(`Management HTTP ${managementRes.status}`);

        // Check if responses are JSON before parsing
        const ownershipContentType = ownershipRes.headers.get('content-type');
        const managementContentType = managementRes.headers.get('content-type');
        if (!ownershipContentType || !ownershipContentType.includes('application/json')) {
          throw new Error('Ownership response is not JSON');
        }
        if (!managementContentType || !managementContentType.includes('application/json')) {
          throw new Error('Management response is not JSON');
        }

        const ownershipJson = (await ownershipRes.json()) as OwnershipCoverageResponse;
        const managementJson = (await managementRes.json()) as ManagementLoadResponse;

        if (!cancelled) {
          setOwnershipData(ownershipJson);
          setManagementData(managementJson);
        }
      } catch (err) {
        if (!cancelled) setError("Couldn't load ownership & management data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-3xl border border-white/5 bg-slate-900/80 shadow-[0_24px_80px_rgba(0,0,0,0.25)] p-6 md:p-7">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Ownership & Management</h2>
          <p className="mt-1 text-sm text-slate-400">
            Coverage and load — find missing owners and overloaded managers.
          </p>
        </div>
        <div className="text-xs text-slate-500">{loading ? "Loading…" : "Updated"}</div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/65">
          Ownership & Management unavailable — check Org data sources.
        </div>
      ) : loading ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
            />
          ))}
        </div>
      ) : ownershipData && managementData ? (
        <>
          {/* Row 1: Two cards */}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {/* Ownership Coverage Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h3 className="text-sm font-semibold text-slate-200">Ownership coverage</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Unowned departments</span>
                  <span className="font-medium text-slate-100">{ownershipData.totals.unownedDepartments}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Unowned teams</span>
                  <span className="font-medium text-slate-100">{ownershipData.totals.unownedTeams}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Unowned positions</span>
                  <span className="font-medium text-slate-100">{ownershipData.totals.unownedPositions}</span>
                </div>
              </div>
              <Link
                href="/org/people?mode=fix&focus=ownership"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
              >
                Fix ownership →
              </Link>
            </div>

            {/* Management Load Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h3 className="text-sm font-semibold text-slate-200">Management load</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Managers</span>
                  <span className="font-medium text-slate-100">{managementData.totals.managers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Avg span</span>
                  <span className="font-medium text-slate-100">{managementData.totals.avgSpan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Max span</span>
                  <span className="font-medium text-slate-100">{managementData.totals.maxSpan}</span>
                </div>
              </div>
              <Link
                href="/org/people?mode=fix&focus=management"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
              >
                Fix management →
              </Link>
            </div>
          </div>

          {/* Row 2: Two lists */}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* Unowned entities list */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                Unowned entities
              </h4>
              <div className="space-y-2">
                {ownershipData.unowned.departments.slice(0, 2).map((dept) => (
                  <Link
                    key={dept.id}
                    href="/org/structure"
                    className="block rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-300 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                  >
                    <div className="font-medium">{dept.name}</div>
                    <div className="mt-0.5 text-slate-500">Department</div>
                  </Link>
                ))}
                {ownershipData.unowned.teams.slice(0, 2).map((team) => (
                  <Link
                    key={team.id}
                    href="/org/structure"
                    className="block rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-300 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                  >
                    <div className="font-medium">{team.name}</div>
                    <div className="mt-0.5 text-slate-500">Team{team.departmentName ? ` · ${team.departmentName}` : ""}</div>
                  </Link>
                ))}
                {ownershipData.unowned.positions.slice(0, 2).map((pos) => (
                  <Link
                    key={pos.id}
                    href="/org/people?mode=fix&focus=ownership"
                    className="block rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-300 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                  >
                    <div className="font-medium">{pos.name}</div>
                    <div className="mt-0.5 text-slate-500">
                      Position{pos.teamName ? ` · ${pos.teamName}` : ""}
                    </div>
                  </Link>
                ))}
                {(ownershipData.unowned.departments.length === 0 &&
                  ownershipData.unowned.teams.length === 0 &&
                  ownershipData.unowned.positions.length === 0) && (
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-500">
                    All entities have owners
                  </div>
                )}
              </div>
            </div>

            {/* Top managers list */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                Top managers by span
              </h4>
              <div className="space-y-2">
                {managementData.topManagers.slice(0, 6).map((mgr) => (
                  <Link
                    key={mgr.id}
                    href={`/org/people?personId=${mgr.id}`}
                    className="block rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-300 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{mgr.name}</div>
                        <div className="mt-0.5 text-slate-500">
                          {mgr.title || "Manager"}
                          {mgr.departmentName ? ` · ${mgr.departmentName}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100">{mgr.directReports}</span>
                        {mgr.isOverloaded && (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                            Overloaded
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
                {managementData.topManagers.length === 0 && (
                  <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-500">
                    No managers found
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

type OrgOverviewClientProps = {
  org: {
    id: string;
    name: string;
  };
  stats: OrgOverviewStats | null;
  statsError: string | null;
  insightsSnapshot: OrgInsightsSnapshot | null;
  canViewInsights: boolean;
};

export function OrgOverviewClient({
  org,
  stats,
  statsError,
  insightsSnapshot,
  canViewInsights,
}: OrgOverviewClientProps) {
  const loading = !stats;
  const noAccess = isOrgNoAccessError(statsError);

  const isCompletelyEmpty =
    !loading &&
    !!stats &&
    stats.peopleCount === 0 &&
    stats.teamCount === 0 &&
    stats.departmentCount === 0 &&
    stats.openInvitesCount === 0;

  return (
    <div className="px-10 pb-10">
        {isCompletelyEmpty ? (
          <div className="mt-8">
            <OrgEmptyState
              title="Get started with your organization"
              description={
                <>
                  Welcome to your Org Center. Start by inviting team members or setting up your
                  structure.{" "}
                  <span className="text-slate-500">
                    Insights will appear once your team grows —{" "}
                    <Link href="/org/insights" className="text-blue-400 hover:underline">
                      learn more →
                    </Link>
                  </span>
                </>
              }
              primaryActionLabel="Invite your first member"
              primaryActionHref="/org/settings?tab=members"
              secondaryActionLabel="Set up structure"
              secondaryActionHref="/org/structure"
            />
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            {/* Unified metrics ribbon */}
            <OrgOverviewStatsRibbon
              stats={stats}
              insightsSnapshot={insightsSnapshot}
              canViewInsights={canViewInsights}
              loading={loading}
            />

            {/* Ownership & Management */}
            <OwnershipManagementStrip />

            {/* Needs attention (ownership gaps) */}
            <NeedsAttentionStrip />

            {/* Capacity snapshot */}
            <CapacitySnapshotStrip />

            {/* Key workspaces */}
            <section className="space-y-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                KEY WORKSPACES
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="flex flex-col rounded-3xl border border-white/5 bg-slate-900/80 shadow-[0_24px_80px_rgba(0,0,0,0.25)] p-6 md:p-7 transition-all duration-200 hover:-translate-y-[1px] hover:border-white/10 hover:bg-slate-900/90 hover:shadow-[0_24px_80px_rgba(0,0,0,0.35)] focus-within:ring-2 focus-within:ring-primary/60 focus-within:ring-offset-2 focus-within:ring-offset-slate-900 focus-within:outline-none">
                  <div className="mb-2 flex-1">
                    <h3 className="text-lg font-semibold text-slate-100">People directory</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      See everyone in your organization, their roles, and where they sit.
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Use this view to understand who is in the org and how they are distributed across
                      teams and departments.
                    </p>
                  </div>
                  <div className="mt-auto pt-3">
                    <Link
                      href="/org/people"
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-1.5 text-[13px] font-medium text-slate-900 shadow-sm transition-all duration-200 hover:bg-white hover:shadow-md hover:-translate-y-[1px] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
                    >
                      View People
                      <span className="ml-0.5">→</span>
                    </Link>
                  </div>
                </div>

                <div className="flex flex-col rounded-3xl border border-white/5 bg-slate-900/80 shadow-[0_24px_80px_rgba(0,0,0,0.25)] p-6 md:p-7 transition-all duration-200 hover:-translate-y-[1px] hover:border-white/10 hover:bg-slate-900/90 hover:shadow-[0_24px_80px_rgba(0,0,0,0.35)] focus-within:ring-2 focus-within:ring-primary/60 focus-within:ring-offset-2 focus-within:ring-offset-slate-900 focus-within:outline-none">
                  <div className="mb-2 flex-1">
                    <h3 className="text-lg font-semibold text-slate-100">Org structure</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Quickly navigate teams, departments, and role definitions.
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Start here when you&apos;re thinking in terms of groups, reporting lines, or
                      responsibilities rather than individual people.
                    </p>
                  </div>
                  <div className="mt-auto pt-3">
                    <Link
                      href="/org/structure"
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-1.5 text-[13px] font-medium text-slate-900 shadow-sm transition-all duration-200 hover:bg-white hover:shadow-md hover:-translate-y-[1px] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
                    >
                      View Structure
                      <span className="ml-0.5">→</span>
                    </Link>
                  </div>
                </div>

                <div className="flex flex-col rounded-3xl border border-white/5 bg-slate-900/80 shadow-[0_24px_80px_rgba(0,0,0,0.25)] p-6 md:p-7 transition-all duration-200 hover:-translate-y-[1px] hover:border-white/10 hover:bg-slate-900/90 hover:shadow-[0_24px_80px_rgba(0,0,0,0.35)] focus-within:ring-2 focus-within:ring-primary/60 focus-within:ring-offset-2 focus-within:ring-offset-slate-900 focus-within:outline-none">
                  <div className="mb-2 flex-1">
                    <h3 className="text-lg font-semibold text-slate-100">Org chart</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      See how departments connect across your organization.
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Visualize your organization's structure and understand reporting relationships
                      at a glance.
                    </p>
                  </div>
                  <div className="mt-auto pt-3">
                    <Link
                      href="/org/chart"
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-1.5 text-[13px] font-medium text-slate-900 shadow-sm transition-all duration-200 hover:bg-white hover:shadow-md hover:-translate-y-[1px] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
                    >
                      View Org Chart
                      <span className="ml-0.5">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* "What's possible here?" helper strip */}
            <section className="rounded-3xl border border-white/5 bg-slate-900/80 shadow-[0_24px_80px_rgba(0,0,0,0.25)] p-6 md:p-7">
              <div className="grid gap-8 md:grid-cols-3 items-start">
                {/* Column 1: Title + description */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                    What&apos;s possible here?
                  </div>
                  <p className="mt-3 text-sm text-slate-300/80 leading-relaxed">
                    The Org Center helps you understand how your organization is shaped and who is doing what, so you can grow without losing clarity.
                  </p>
                </div>
                {/* Column 2: Map your structure */}
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    1. Map your structure
                  </p>
                  <p className="mt-3 text-sm text-slate-300/80 leading-relaxed">
                    Add departments, teams, and roles so everyone knows how work is organized and where they fit.
                  </p>
                </div>
                {/* Column 3: Connect people to work */}
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    2. Connect people to work
                  </p>
                  <p className="mt-3 text-sm text-slate-300/80 leading-relaxed">
                    Invite teammates, assign them to teams and roles, and keep a single source of truth for who is responsible for what.
                  </p>
                </div>
              </div>
            </section>

            {/* Spacer so the page ends cleanly after Key Workspaces + helper */}
            <div className="h-2" aria-hidden />

            {noAccess && (
              <div className="mt-6">
                <OrgNoAccessState />
              </div>
            )}
          </div>
        )}
    </div>
  );
}


