"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PersonDrawer from "./person-drawer";
import ManagerPickerModal from "./manager-picker-modal";
import OrphanRepairModal from "./orphan-repair-modal";
import StructureValidationPanel from "./structure-validation-panel";
import CycleRepairModal from "./cycle-repair-modal";

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

function FixQueuePanel({ focus }: { focus: "ownership" | "management" }) {
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
        if (focus === "ownership") {
          const res = await fetch("/api/org/health/ownership", { cache: "no-store" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = (await res.json()) as OwnershipCoverageResponse;
          if (!cancelled) setOwnershipData(json);
        } else if (focus === "management") {
          const res = await fetch("/api/org/health/management-load", { cache: "no-store" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = (await res.json()) as ManagementLoadResponse;
          if (!cancelled) setManagementData(json);
        }
      } catch {
        if (!cancelled) setError("Couldn't load fix queue data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [focus]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-white">Fix queue</h2>
        <p className="mt-0.5 text-xs text-white/60">
          Focus:{" "}
          <span className="text-white/80">
            {focus === "ownership" ? "Ownership coverage" : "Management load"}
          </span>
        </p>
      </div>

      {error ? (
        <div className="text-xs text-red-400">{error}</div>
      ) : loading ? (
        <div className="text-xs text-white/50">Loading...</div>
      ) : focus === "ownership" && ownershipData ? (
        <div className="space-y-2">
          {ownershipData.unowned.departments.slice(0, 3).map((dept) => (
            <Link
              key={dept.id}
              href="/org/structure"
              className="block rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/70 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
            >
              <div className="font-medium">{dept.name}</div>
              <div className="mt-0.5 text-white/50">Department without owner</div>
            </Link>
          ))}
          {ownershipData.unowned.teams.slice(0, 3).map((team) => (
            <Link
              key={team.id}
              href="/org/structure"
              className="block rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/70 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
            >
              <div className="font-medium">{team.name}</div>
              <div className="mt-0.5 text-white/50">
                Team without owner{team.departmentName ? ` · ${team.departmentName}` : ""}
              </div>
            </Link>
          ))}
          {ownershipData.unowned.positions.slice(0, 3).map((pos) => (
            <Link
              key={pos.id}
              href={`/org/people?personId=${pos.id}`}
              className="block rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/70 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
            >
              <div className="font-medium">{pos.name}</div>
              <div className="mt-0.5 text-white/50">
                Position without owner{pos.teamName ? ` · ${pos.teamName}` : ""}
              </div>
            </Link>
          ))}
          {ownershipData.unowned.departments.length === 0 &&
            ownershipData.unowned.teams.length === 0 &&
            ownershipData.unowned.positions.length === 0 && (
              <div className="text-xs text-white/50">All entities have owners</div>
            )}
        </div>
      ) : focus === "management" && managementData ? (
        <div className="space-y-2">
          {managementData.topManagers
            .filter((m) => m.isOverloaded)
            .slice(0, 3)
            .map((mgr) => (
              <Link
                key={mgr.id}
                href={`/org/people?personId=${mgr.id}`}
                className="block rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/70 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{mgr.name}</div>
                    <div className="mt-0.5 text-white/50">
                      {mgr.title || "Manager"}
                      {mgr.departmentName ? ` · ${mgr.departmentName}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{mgr.directReports} reports</span>
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                      Overloaded
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          {managementData.orphans.slice(0, 3).map((orphan) => (
            <Link
              key={orphan.id}
              href={`/org/people?personId=${orphan.id}`}
              className="block rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/70 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
            >
              <div className="font-medium">{orphan.name}</div>
              <div className="mt-0.5 text-white/50">
                {orphan.title || "Person"} without manager
              </div>
            </Link>
          ))}
          {managementData.topManagers.filter((m) => m.isOverloaded).length === 0 &&
            managementData.orphans.length === 0 && (
              <div className="text-xs text-white/50">No management issues found</div>
            )}
        </div>
      ) : null}
    </div>
  );
}

type RecentChange = {
  at: string;
  kind: "person_update";
  personId: string;
  personName: string;
  fields: string[];
};

type OrgHealth = {
  ok: boolean;
  total: number;
  overallPct: number;
  breakdown: {
    reporting: { covered: number; total: number; pct: number };
    roles: { covered: number; total: number; pct: number };
    teams: { covered: number; total: number; pct: number };
  };
};

type PersonRow = {
  id: string;
  name: string;
  email: string | null;
  title: string | null;
  roleName: string | null;
  teamName: string | null;
  managerId: string | null;
  createdAt?: string;
  isManager?: boolean;
  needsAttention?: boolean;
  missing?: { reporting: boolean; role: boolean; team: boolean };
};

type SavedView = {
  id: string;
  name: string;
  key: string;
  filters: any;
};

export default function PeopleClient(props: { orgId: string; initialPeople: PersonRow[] }) {
  const { orgId } = props;

  const [people, setPeople] = useState<PersonRow[]>(props.initialPeople);
  const [mode, setMode] = useState<"explore" | "fix">("explore");
  const [fixIssue, setFixIssue] = useState<
    | null
    | "missing_manager"
    | "missing_role"
    | "missing_team"
    | "missing_team_lead"
    | "orphan_team"
  >(null);
  const [fixFocus, setFixFocus] = useState<"ownership" | "management" | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"name_asc" | "name_desc">("name_asc");

  const [filterNeedsAttention, setFilterNeedsAttention] = useState(false);
  const [filterMissingReporting, setFilterMissingReporting] = useState(false);
  const [filterMissingRole, setFilterMissingRole] = useState(false);
  const [filterMissingTeam, setFilterMissingTeam] = useState(false);
  const [filterManagersOnly, setFilterManagersOnly] = useState(false);
  const [createdWithinDays, setCreatedWithinDays] = useState<number | null>(null);
  const [availabilityFilter, setAvailabilityFilter] = useState<"available" | "unavailable" | "returning_soon" | null>(null);
  const [deptFilter, setDeptFilter] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  
  // Bulk selection state
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter(id => selected[id]), [selected]);
  const [bulkOpen, setBulkOpen] = useState(false);
  
  // Person drawer state
  const [activePersonId, setActivePersonId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Recent changes state (session-only)
  const [recentChanges, setRecentChanges] = useState<RecentChange[]>([]);
  
  // Org health state
  const [health, setHealth] = useState<OrgHealth | null>(null);
  
  // Issue view state
  const [issueView, setIssueView] = useState<"all" | "reporting" | "roles" | "teams">("all");
  
  // Saved views state
  const [views, setViews] = useState<SavedView[]>([]);
  const [activeViewKey, setActiveViewKey] = useState<string | null>(null);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  
  // Org structure state
  const [structure, setStructure] = useState<any | null>(null);
  
  // Manager picker state
  const [managerModalOpen, setManagerModalOpen] = useState(false);
  const [managerTargetIds, setManagerTargetIds] = useState<string[]>([]);
  
  // Orphan repair state
  const [repairOpen, setRepairOpen] = useState(false);
  const [repairRootKey, setRepairRootKey] = useState<string | null>(null);
  
  // Validation state
  const [validation, setValidation] = useState<any | null>(null);
  const [cycleOpen, setCycleOpen] = useState(false);
  
  const router = useRouter();

  const filtered = useMemo(() => {
    let list = [...people];

    // Issue view filtering (big switch)
    if (issueView === "reporting") list = list.filter(p => p.missing?.reporting);
    if (issueView === "roles") list = list.filter(p => p.missing?.role);
    if (issueView === "teams") list = list.filter(p => p.missing?.team);

    // Mode defaults: Fix implies needs-attention intent
    const effectiveNeedsAttention = mode === "fix" ? true : filterNeedsAttention;

    if (effectiveNeedsAttention) list = list.filter(p => p.needsAttention);
    if (filterMissingReporting) list = list.filter(p => p.missing?.reporting);
    if (filterMissingRole) list = list.filter(p => p.missing?.role);
    if (filterMissingTeam) list = list.filter(p => p.missing?.team);
    if (filterManagersOnly) list = list.filter(p => p.isManager);
    
    // Recent hires filter
    if (createdWithinDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - createdWithinDays);
      list = list.filter(p => {
        if (!p.createdAt) return false;
        return new Date(p.createdAt) >= cutoff;
      });
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(p => {
        return (
          p.name.toLowerCase().includes(q) ||
          (p.email || "").toLowerCase().includes(q) ||
          (p.title || "").toLowerCase().includes(q) ||
          (p.roleName || "").toLowerCase().includes(q) ||
          (p.teamName || "").toLowerCase().includes(q)
        );
      });
    }

    list.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sort === "name_asc" ? cmp : -cmp;
    });

    // Visual prioritization (premium UX): managers first, then issues, then everyone else
    list.sort((a, b) => {
      const aTier = a.isManager ? 0 : a.needsAttention ? 1 : 2;
      const bTier = b.isManager ? 0 : b.needsAttention ? 1 : 2;
      return aTier - bTier;
    });

    return list;
  }, [
    people,
    issueView,
    mode,
    filterNeedsAttention,
    filterMissingReporting,
    filterMissingRole,
    filterMissingTeam,
    filterManagersOnly,
    createdWithinDays,
    query,
    sort,
  ]);

  const stats = useMemo(() => {
    const total = people.length;
    const managers = people.filter(p => p.isManager).length;
    const individuals = total - managers;
    const needsAttention = people.filter(p => p.needsAttention).length;
    return { total, managers, individuals, needsAttention };
  }, [people]);
  
  // Derive issues for banner
  const issues = useMemo(() => {
    const missingReporting = people.filter(p => p.missing?.reporting).length;
    const missingRole = people.filter(p => p.missing?.role).length;
    const missingTeam = people.filter(p => p.missing?.team).length;
    const needsAttention = people.filter(p => p.needsAttention).length;
    return { missingReporting, missingRole, missingTeam, needsAttention };
  }, [people]);

  async function refresh() {
    const res = await fetch(`/api/org/people`);
    const json = await res.json();
    if (!res.ok || !json?.ok) return;

    const peopleRaw: any[] = json.people ?? [];
    const byId = new Map(peopleRaw.map(p => [p.id, p]));
    const rows: PersonRow[] = peopleRaw.map(p => {
      const hasManager = !!p.managerId && byId.has(p.managerId);
      const missing = {
        reporting: !hasManager && peopleRaw.length > 1,
        role: !p.roleName,
        team: !p.teamName,
      };
      const needsAttention = missing.reporting || missing.role || missing.team;
      const isManager = peopleRaw.some(x => x.managerId === p.id);
      return { ...p, isManager, needsAttention, missing };
    });

    setPeople(rows);
    await fetchHealth();
    await fetchStructure();
    await fetchValidation();
  }

  async function fetchHealth() {
    const res = await fetch(`/api/org/people/health?orgId=${encodeURIComponent(orgId)}`);
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) return;
    setHealth(json);
  }
  
  async function fetchStructure() {
    const res = await fetch(`/api/org/people/structure?orgId=${encodeURIComponent(orgId)}`);
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) return;
    setStructure(json);
  }
  
  async function fetchValidation() {
    const res = await fetch(`/api/org/people/structure/validate?orgId=${encodeURIComponent(orgId)}`);
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) return;
    setValidation(json);
  }
  
  // Fetch health, structure, and validation on mount
  useEffect(() => {
    fetchHealth();
    fetchStructure();
    fetchValidation();
    loadViews();
  }, []);
  
  // Handle deep links from Org Chart
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const sp = new URLSearchParams(window.location.search);
    const modeParam = sp.get("mode");
    const issueParam = sp.get("issue");
    const focusParam = sp.get("focus");
    const openParam = sp.get("open");
    const availabilityParam = sp.get("availability");
    const deptParam = sp.get("dept");
    const personIdParam = sp.get("personId");
    
    // Set mode if specified
    if (modeParam === "fix") {
      setMode("fix");
    } else if (modeParam === "explore") {
      setMode("explore");
    }

    // Handle availability filter
    if (availabilityParam === "available" || availabilityParam === "unavailable" || availabilityParam === "returning_soon") {
      setAvailabilityFilter(availabilityParam);
      setMode("explore");
    }

    // Handle department filter
    if (deptParam) {
      setDeptFilter(deptParam);
      setMode("explore");
    }

    // Handle focus param (ownership/management)
    if (focusParam === "ownership" || focusParam === "management") {
      setFixFocus(focusParam);
      setMode("fix");
    }

    // Seed fix queue issue (lightweight routing only)
    const normalizedIssue =
      issueParam === "missing_manager" ||
      issueParam === "missing_role" ||
      issueParam === "missing_team" ||
      issueParam === "missing_team_lead" ||
      issueParam === "orphan_team"
        ? issueParam
        : null;

    if (normalizedIssue) {
      setFixIssue(normalizedIssue);
      setMode("fix");

      // Preselect the best matching filters we already have
      if (normalizedIssue === "missing_manager") {
        setIssueView("reporting");
        setFilterMissingReporting(true);
        setFilterMissingRole(false);
        setFilterMissingTeam(false);
      } else if (normalizedIssue === "missing_role") {
        setIssueView("roles");
        setFilterMissingRole(true);
        setFilterMissingReporting(false);
        setFilterMissingTeam(false);
      } else if (normalizedIssue === "missing_team") {
        setIssueView("teams");
        setFilterMissingTeam(true);
        setFilterMissingReporting(false);
        setFilterMissingRole(false);
      } else {
        // Team-level issues not modeled as person filters yet
        setIssueView("all");
      }
    } else {
      setFixIssue(null);
    }
    
    // Auto-open modals if specified
    if (openParam === "cycles") {
      setCycleOpen(true);
    } else if (openParam === "orphans") {
      // Open orphan repair for largest cluster
      if (structure) {
        const firstOrphan = (structure.clusters || []).find((c: any) => String(c.key).startsWith("orphan:"))?.key;
        if (firstOrphan) {
          setRepairRootKey(firstOrphan);
          setRepairOpen(true);
        }
      }
    }
    
    // Focus validation panel if specified (scroll to it)
    if (focusParam === "validation") {
      // Scroll to validation panel after a short delay to ensure it's rendered
      setTimeout(() => {
        const validationPanel = document.querySelector('[data-panel="validation"]');
        if (validationPanel) {
          validationPanel.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }

    // Handle personId deep-link (open drawer)
    if (personIdParam) {
      const person = people.find((p) => p.id === personIdParam);
      if (person) {
        setActivePersonId(personIdParam);
        setDrawerOpen(true);
      }
    }
  }, [people]);
  
  async function loadViews() {
    const res = await fetch(`/api/org/views?orgId=${encodeURIComponent(orgId)}&scope=people`);
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) return;
    const loadedViews = json.views || [];
    setViews(loadedViews);
    
    // Ensure default views exist
    if (loadedViews.length === 0) {
      await ensureDefaultViews();
    }
  }
  
  async function ensureDefaultViews() {
    const defaults = [
      {
        name: "Org Issues",
        key: "org_issues",
        filters: { mode: "fix", issueView: "all", filterNeedsAttention: true },
      },
      {
        name: "Leadership",
        key: "leadership",
        filters: { mode: "explore", filterManagersOnly: true },
      },
      {
        name: "Leadership Structure",
        key: "leadership_structure",
        filters: { mode: "explore", filterManagersOnly: true },
      },
      {
        name: "Recent Hires",
        key: "recent_hires",
        filters: { mode: "explore", createdWithinDays: 30 },
      },
    ];
    
    for (const def of defaults) {
      await fetch("/api/org/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, scope: "people", ...def }),
      });
    }
    
    await loadViews();
  }
  
  // Apply active view filters
  useEffect(() => {
    if (!activeViewKey) return;
    const view = views.find(v => v.key === activeViewKey);
    if (!view) return;
    
    const f = view.filters || {};
    if (f.mode) setMode(f.mode);
    if (f.issueView !== undefined) setIssueView(f.issueView);
    if (f.filterManagersOnly !== undefined) setFilterManagersOnly(f.filterManagersOnly);
    if (f.filterMissingReporting !== undefined) setFilterMissingReporting(f.filterMissingReporting);
    if (f.filterMissingRole !== undefined) setFilterMissingRole(f.filterMissingRole);
    if (f.filterMissingTeam !== undefined) setFilterMissingTeam(f.filterMissingTeam);
    if (f.filterNeedsAttention !== undefined) setFilterNeedsAttention(f.filterNeedsAttention);
    if (f.createdWithinDays !== undefined) setCreatedWithinDays(f.createdWithinDays);
    setQuery("");
    setSelected({});
    setBulkOpen(false);
  }, [activeViewKey, views]);

  function openPerson(id: string) {
    setActivePersonId(id);
    setDrawerOpen(true);
  }

  function recordChange(c: RecentChange) {
    setRecentChanges((prev) => [c, ...prev].slice(0, 25));
  }
  
  function openRepair(rootKey: string) {
    setRepairRootKey(rootKey);
    setRepairOpen(true);
  }

  async function onCreatePerson(data: {
    name: string;
    email?: string;
    title?: string;
    roleName?: string;
    teamName?: string;
    managerId?: string;
  }) {
    const res = await fetch("/api/org/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.ok) {
      alert(json?.error?.message || "Failed to create person");
      return;
    }

    setAddOpen(false);
    await refresh();
  }

  const showEmpty = people.length === 0;
  
  async function deleteView(viewId: string) {
    const res = await fetch(`/api/org/views/${viewId}?orgId=${encodeURIComponent(orgId)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await loadViews();
      if (activeViewKey === views.find(v => v.id === viewId)?.key) {
        setActiveViewKey(null);
      }
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        {/* People Subnav */}
        <PeopleSubnav
          views={views}
          activeViewKey={activeViewKey}
          onSelectView={(key) => setActiveViewKey(key)}
          onSaveView={() => setSaveViewOpen(true)}
          onDeleteView={deleteView}
          mode={mode}
          onSetMode={setMode}
          onOpenOrgChart={() => router.push("/org/chart")}
        />

        {/* Main Content */}
        <div className="space-y-4">
          {/* Fix queue header (deep links from Overview pills) */}
          {mode === "fix" && fixIssue ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Fix queue</h2>
                  <p className="mt-0.5 text-xs text-white/60">
                    Issue:{" "}
                    <span className="text-white/80">
                      {fixIssue === "missing_manager"
                        ? "People missing manager"
                        : fixIssue === "missing_role"
                          ? "People missing role"
                          : fixIssue === "missing_team"
                            ? "People missing team"
                            : fixIssue === "missing_team_lead"
                              ? "Teams missing lead"
                              : "Teams missing department"}
                    </span>
                  </p>
                </div>

                {(fixIssue === "missing_team_lead" || fixIssue === "orphan_team") && (
                  <a
                    href={`/org/structure?issue=${encodeURIComponent(fixIssue)}`}
                    className="inline-flex items-center justify-center rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black"
                  >
                    Open Structure →
                  </a>
                )}
              </div>
              {(fixIssue === "missing_team_lead" || fixIssue === "orphan_team") && (
                <div className="mt-2 text-xs text-white/55">
                  This issue is team-level; we'll add a dedicated fix queue here next. For now,
                  use Structure to resolve it.
                </div>
              )}
            </div>
          ) : null}

          {/* Fix queue for ownership/management focus */}
          {mode === "fix" && fixFocus ? (
            <FixQueuePanel focus={fixFocus} />
          ) : null}

          {/* Org Health strip with completeness score */}
          <OrgHealthStrip
            health={health}
            onPick={(v) => {
              setMode("fix");
              setIssueView(v);
              setSelected({});
              setBulkOpen(false);
            }}
            onReset={() => {
              setIssueView("all");
              setMode("explore");
              setSelected({});
              setBulkOpen(false);
            }}
          />

          {/* Leadership Structure Mini-Map */}
          <LeadershipMiniMap
            structure={structure}
            onJumpToIssues={(kind) => {
              setMode("fix");
              setIssueView(kind);
              setSelected({});
              setBulkOpen(false);
            }}
            onOpenOrgChart={() => router.push("/org/chart")}
            onRepairOrphans={openRepair}
          />

          {/* Structure Validation Panel */}
          <div data-panel="validation">
            <StructureValidationPanel
              validation={validation}
              onRepairCycles={() => setCycleOpen(true)}
            />
          </div>

          {/* Controls */}
      <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-black/10 bg-white/80 p-1 dark:border-white/10 dark:bg-white/10">
              <button
                onClick={() => {
                  setMode("explore");
                  setSelected({});
                  setBulkOpen(false);
                }}
                className={`px-3 py-2 text-sm rounded-lg ${mode === "explore" ? "bg-black text-white dark:bg-white dark:text-black" : "text-black/70 dark:text-white/70"}`}
              >
                Explore
              </button>
              <button
                onClick={() => setMode("fix")}
                className={`px-3 py-2 text-sm rounded-lg ${mode === "fix" ? "bg-black text-white dark:bg-white dark:text-black" : "text-black/70 dark:text-white/70"}`}
              >
                Fix
              </button>
            </div>

            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, role, team…"
              className="w-full md:w-[320px] rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-white/10"
            />

            <select
              value={sort}
              onChange={e => setSort(e.target.value as any)}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10"
            >
              <option value="name_asc">Name A–Z</option>
              <option value="name_desc">Name Z–A</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {mode === "fix" && selectedIds.length > 0 && (
              <button
                onClick={() => {
                  setManagerTargetIds(selectedIds);
                  setManagerModalOpen(true);
                }}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
              >
                Set manager ({selectedIds.length})
              </button>
            )}
            <button
              onClick={() => setAddOpen(true)}
              className="rounded-xl bg-black px-3 py-2 text-sm text-white hover:opacity-90 dark:bg-white dark:text-black"
            >
              Add person
            </button>
          </div>
        </div>

        {/* Needs attention strip (calm, global summary) */}
        {issues.needsAttention > 0 && (
          <div className="mt-3 rounded-xl border border-black/10 bg-white/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-black/70 dark:text-white/70">
                <span className="font-medium">Needs attention:</span>{" "}
                {issues.needsAttention} incomplete · {issues.missingReporting} missing reporting line · {issues.missingRole} missing role · {issues.missingTeam} missing team
              </div>
              {mode !== "fix" && (
                <button
                  onClick={() => {
                    setMode("fix");
                    setFilterMissingReporting(true);
                  }}
                  className="rounded-lg border border-black/10 bg-white px-2.5 py-1 text-xs text-black/70 hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15"
                >
                  Fix →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active filters from query params (availability, dept) */}
        {(availabilityFilter || deptFilter) && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-blue-400/40 bg-blue-50/50 px-4 py-2 dark:border-blue-300/30 dark:bg-blue-900/10">
            <span className="text-xs font-medium text-blue-900 dark:text-blue-100">Active filters:</span>
            {availabilityFilter && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                {availabilityFilter === "available" ? "Available now" : availabilityFilter === "unavailable" ? "Unavailable now" : "Returning soon"}
              </span>
            )}
            {deptFilter && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                Department: {deptFilter}
              </span>
            )}
            <Link
              href="/org/people"
              className="ml-auto text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Clear filters →
            </Link>
          </div>
        )}

        {/* Filters (only in Fix mode or when manually enabled) */}
        {(mode === "fix" || filterMissingReporting || filterMissingRole || filterMissingTeam || filterManagersOnly) && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill label="Needs attention" active={filterNeedsAttention || mode === "fix"} onClick={() => mode === "fix" ? null : setFilterNeedsAttention(v => !v)} locked={mode === "fix"} />
            <Pill label="Missing reporting line" active={filterMissingReporting} onClick={() => setFilterMissingReporting(v => !v)} />
            <Pill label="Missing role" active={filterMissingRole} onClick={() => setFilterMissingRole(v => !v)} />
            <Pill label="Missing team" active={filterMissingTeam} onClick={() => setFilterMissingTeam(v => !v)} />
            <Pill label="Managers only" active={filterManagersOnly} onClick={() => setFilterManagersOnly(v => !v)} />
          </div>
        )}

        {/* Bulk selection controls (Fix mode only) */}
        {mode === "fix" && !showEmpty && (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => {
                const newSelected: Record<string, boolean> = {};
                filtered.forEach(p => { newSelected[p.id] = true; });
                setSelected(newSelected);
              }}
              className="rounded-lg border border-black/10 bg-white px-3 py-1 text-xs hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
            >
              Select all ({filtered.length})
            </button>
            <button
              onClick={() => setSelected({})}
              className="rounded-lg border border-black/10 bg-white px-3 py-1 text-xs hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
            >
              Clear
            </button>
            {selectedIds.length > 0 && (
              <>
                <span className="text-xs text-black/50 dark:text-white/50">
                  {selectedIds.length} selected
                </span>
                <button
                  onClick={() => setBulkOpen(true)}
                  className="rounded-lg bg-black px-3 py-1 text-xs text-white hover:opacity-90 dark:bg-white dark:text-black"
                >
                  Bulk actions
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {showEmpty ? (
        <div className="rounded-3xl border border-black/10 bg-white/60 p-10 text-center dark:border-white/10 dark:bg-white/5">
          <div className="text-base font-semibold">Start modeling your organization</div>
          <div className="mt-2 text-sm text-black/50 dark:text-white/50">
            Add your first people to unlock completeness, issues, and directory workflows.
          </div>
          <div className="mt-5">
            <button
              onClick={() => setAddOpen(true)}
              className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90 dark:bg-white dark:text-black"
            >
              Add person
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(p => (
            <PersonCard
              key={p.id}
              person={p}
              selectable={mode === "fix"}
              selected={!!selected[p.id]}
              onToggle={() => setSelected(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
              onOpen={() => openPerson(p.id)}
            />
          ))}
        </div>
      )}

      {addOpen ? (
        <AddPersonModal
          people={people}
          onClose={() => setAddOpen(false)}
          onCreate={onCreatePerson}
        />
      ) : null}

      {bulkOpen ? (
        <BulkActionsDrawer
          open={bulkOpen}
          onClose={() => setBulkOpen(false)}
          orgId={orgId}
          selectedIds={selectedIds}
          people={people.map(p => ({ id: p.id, name: p.name }))}
          onApplied={async () => {
            setSelected({});
            await refresh();
          }}
        />
      ) : null}

      {drawerOpen && activePersonId ? (
        <PersonDrawer
          personId={activePersonId}
          orgId={orgId}
          people={people.map((p) => ({ id: p.id, name: p.name }))}
          onClose={() => {
            setDrawerOpen(false);
            // Clear personId from URL when closing
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.delete("personId");
              window.history.pushState({}, "", url.toString());
            }
          }}
          onUpdated={async () => {
            await refresh();
          }}
          onRecordChange={recordChange}
        />
      ) : null}

          {saveViewOpen ? (
            <SaveViewModal
              onClose={() => setSaveViewOpen(false)}
              onSave={async (name, key) => {
                const filters = {
                  mode,
                  issueView,
                  filterManagersOnly,
                  filterMissingReporting,
                  filterMissingRole,
                  filterMissingTeam,
                  filterNeedsAttention,
                  createdWithinDays,
                };
                const res = await fetch("/api/org/views", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orgId, scope: "people", name, key, filters }),
                });
                const json = await res.json().catch(() => null);
                if (res.ok && json?.ok) {
                  await loadViews();
                  setActiveViewKey(key);
                  setSaveViewOpen(false);
                } else {
                  alert(json?.error?.message || "Failed to save view");
                }
              }}
            />
          ) : null}

          {managerModalOpen ? (
            <ManagerPickerModal
              orgId={orgId}
              people={people.map((p) => ({ id: p.id, name: p.name }))}
              excludeIds={managerTargetIds}
              count={managerTargetIds.length}
              onClose={() => setManagerModalOpen(false)}
              onApply={async (managerIdOrNull) => {
                const res = await fetch("/api/org/people/manager", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orgId, personIds: managerTargetIds, managerId: managerIdOrNull }),
                });
                const json = await res.json().catch(() => null);
                if (!res.ok || !json?.ok) {
                  alert(json?.error?.message || "Failed to update manager");
                  return;
                }
                setManagerModalOpen(false);
                setSelected({});
                setManagerTargetIds([]);
                await refresh();
              }}
            />
          ) : null}

          {repairOpen && repairRootKey ? (
            <OrphanRepairModal
              orgId={orgId}
              rootKey={repairRootKey}
              people={people.map((p) => ({ id: p.id, name: p.name }))}
              onClose={() => setRepairOpen(false)}
              onApplied={async () => {
                setRepairOpen(false);
                await refresh();
              }}
            />
          ) : null}

          {cycleOpen ? (
            <CycleRepairModal
              orgId={orgId}
              validation={validation}
              people={people.map((p) => ({ id: p.id, name: p.name }))}
              onClose={() => setCycleOpen(false)}
              onApplied={async () => {
                setCycleOpen(false);
                await refresh();
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Pill(props: { label: string; active: boolean; onClick: () => void; locked?: boolean }) {
  return (
    <button
      onClick={props.locked ? undefined : props.onClick}
      className={[
        "rounded-full border px-3 py-1 text-xs",
        props.active
          ? "border-black/20 bg-black text-white dark:border-white/20 dark:bg-white dark:text-black"
          : "border-black/10 bg-white/70 text-black/70 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10",
        props.locked ? "opacity-60 cursor-not-allowed" : "",
      ].join(" ")}
    >
      {props.label}
    </button>
  );
}

function OrgHealthStrip(props: {
  health: OrgHealth | null;
  onPick: (v: "reporting" | "roles" | "teams") => void;
  onReset: () => void;
}) {
  const h = props.health;
  if (!h) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="h-4 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        <div className="mt-3 h-4 w-72 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Org completeness</div>
          <div className="mt-1 text-xs text-black/50 dark:text-white/50">
            {h.overallPct}% modeled · {h.total} people
          </div>
        </div>
        <button
          onClick={props.onReset}
          className="text-xs text-black/50 hover:text-black/80 dark:text-white/50 dark:hover:text-white/80"
        >
          Reset view
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <Metric
          label="Reporting lines"
          value={`${h.breakdown.reporting.pct}%`}
          sub={`${h.breakdown.reporting.covered}/${h.breakdown.reporting.total}`}
          onClick={() => props.onPick("reporting")}
        />
        <Metric
          label="Roles assigned"
          value={`${h.breakdown.roles.pct}%`}
          sub={`${h.breakdown.roles.covered}/${h.breakdown.roles.total}`}
          onClick={() => props.onPick("roles")}
        />
        <Metric
          label="Teams assigned"
          value={`${h.breakdown.teams.pct}%`}
          sub={`${h.breakdown.teams.covered}/${h.breakdown.teams.total}`}
          onClick={() => props.onPick("teams")}
        />
      </div>
    </div>
  );
}

function Metric(props: { label: string; value: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={props.onClick}
      className="rounded-2xl border border-black/10 bg-white/70 p-3 text-left hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
    >
      <div className="text-xs text-black/50 dark:text-white/50">{props.label}</div>
      <div className="mt-1 text-lg font-semibold">{props.value}</div>
      <div className="mt-1 text-xs text-black/40 dark:text-white/40">{props.sub}</div>
    </button>
  );
}

function PeopleSubnav(props: {
  views: SavedView[];
  activeViewKey: string | null;
  onSelectView: (key: string) => void;
  onSaveView: () => void;
  onDeleteView: (viewId: string) => void;
  mode: "explore" | "fix";
  onSetMode: (mode: "explore" | "fix") => void;
  onOpenOrgChart: () => void;
}) {
  return (
    <div className="space-y-3">
      {/* Quick actions */}
      <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="text-xs font-medium text-black/60 dark:text-white/60">Quick Actions</div>
        <div className="mt-2 space-y-1">
          <button
            onClick={() => {
              props.onSetMode("explore");
              props.onSelectView(null as any);
            }}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
              !props.activeViewKey && props.mode === "explore"
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
            }`}
          >
            All People
          </button>
          <button
            onClick={() => props.onSetMode(props.mode === "fix" ? "explore" : "fix")}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
          >
            {props.mode === "fix" ? "Switch to Explore" : "Switch to Fix"}
          </button>
          <button
            onClick={props.onOpenOrgChart}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
          >
            Open Org Chart →
          </button>
        </div>
      </div>

      {/* Saved Views */}
      <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-black/60 dark:text-white/60">Saved Views</div>
          <button
            onClick={props.onSaveView}
            className="text-xs text-black/50 hover:text-black/80 dark:text-white/50 dark:hover:text-white/80"
          >
            + Save
          </button>
        </div>
        <div className="mt-2 space-y-1">
          {props.views.map((view) => (
            <div
              key={view.id}
              className={`group flex items-center justify-between rounded-lg px-3 py-2 ${
                props.activeViewKey === view.key
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
              }`}
            >
              <button
                onClick={() => props.onSelectView(view.key)}
                className="flex-1 text-left text-sm"
              >
                {view.name}
              </button>
              {!["org_issues", "leadership", "leadership_structure", "recent_hires"].includes(view.key) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete view "${view.name}"?`)) {
                      props.onDeleteView(view.id);
                    }
                  }}
                  className="ml-2 opacity-0 group-hover:opacity-100 text-xs hover:text-red-500"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {props.views.length === 0 && (
            <div className="text-sm text-black/50 dark:text-white/50">No saved views yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveViewModal(props: {
  onClose: () => void;
  onSave: (name: string, key: string) => void;
}) {
  const [name, setName] = useState("");
  const key = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" onClick={props.onClose}>
      <div
        className="w-full max-w-md rounded-3xl border border-black/10 bg-white/90 p-5 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-zinc-950/90"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold">Save Current View</div>
            <div className="mt-1 text-sm text-black/50 dark:text-white/50">
              Save your current filters as a reusable view.
            </div>
          </div>
          <button
            onClick={props.onClose}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
          >
            Cancel
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm text-black/70 dark:text-white/70">
              View name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Engineering Team"
                className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-white/10"
                autoFocus
              />
            </label>
          </div>
          {key && (
            <div className="text-xs text-black/50 dark:text-white/50">
              Key: <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">{key}</code>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => {
              if (name.trim() && key) {
                props.onSave(name.trim(), key);
              }
            }}
            disabled={!name.trim() || !key}
            className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50 hover:opacity-90 dark:bg-white dark:text-black"
          >
            Save View
          </button>
        </div>
      </div>
    </div>
  );
}

function LeadershipMiniMap(props: {
  structure: any | null;
  onJumpToIssues: (v: "reporting" | "roles" | "teams") => void;
  onOpenOrgChart: () => void;
  onRepairOrphans: (rootKey: string) => void;
}) {
  const s = props.structure;
  if (!s) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="h-4 w-48 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        <div className="mt-3 h-16 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      </div>
    );
  }

  const t = s.totals || {};

  return (
    <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Leadership structure</div>
          <div className="mt-1 text-xs text-black/50 dark:text-white/50">
            {t.people} people · {t.managers} managers · {t.topLevel} top-level · {t.orphanClusters} orphan clusters
          </div>
        </div>

        <button
          onClick={props.onOpenOrgChart}
          className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
        >
          Open Org Chart
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <MiniPanel title="Top managers" subtitle="Largest direct report sets">
          <div className="space-y-2">
            {(s.managers || []).slice(0, 5).map((m: any) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <div className="truncate">{m.name}</div>
                <div className="text-xs text-black/50 dark:text-white/50">{m.reports}</div>
              </div>
            ))}
            {(s.managers || []).length === 0 && (
              <div className="text-sm text-black/50 dark:text-white/50">No managers yet</div>
            )}
          </div>
        </MiniPanel>

        <MiniPanel title="Top-level leaders" subtitle="No manager recorded">
          <div className="space-y-2">
            {(s.topLevel || []).slice(0, 5).map((p: any) => (
              <div key={p.id} className="truncate text-sm">
                {p.name}
              </div>
            ))}
            {(s.topLevel || []).length === 0 && (
              <div className="text-sm text-black/50 dark:text-white/50">Everyone reports to someone</div>
            )}
          </div>
          {t.topLevel > 0 && (
            <div className="mt-2">
              <button
                onClick={() => props.onJumpToIssues("reporting")}
                className="text-xs text-black/60 hover:text-black/90 dark:text-white/60 dark:hover:text-white/90"
              >
                Review reporting gaps →
              </button>
            </div>
          )}
        </MiniPanel>

        <MiniPanel title="Orphans & anomalies" subtitle="Disconnected or cyclic">
          <div className="space-y-2">
            <div className="text-sm">
              Orphan roots: <span className="text-black/60 dark:text-white/60">{t.orphanRoots || 0}</span>
            </div>
            <div className="text-sm">
              Orphan clusters: <span className="text-black/60 dark:text-white/60">{t.orphanClusters || 0}</span>
            </div>
            <div className="text-sm">
              Cycles: <span className="text-black/60 dark:text-white/60">{t.cycleClusters || 0}</span>
            </div>
          </div>
          {t.orphanClusters > 0 && (
            <div className="mt-2 space-y-1">
              <button
                onClick={() => {
                  const firstOrphan = (s.clusters || []).find((c: any) => String(c.key).startsWith("orphan:"))?.key;
                  if (firstOrphan) props.onRepairOrphans(firstOrphan);
                }}
                className="w-full text-left text-xs text-black/60 hover:text-black/90 dark:text-white/60 dark:hover:text-white/90"
              >
                Repair orphans →
              </button>
            </div>
          )}
          {(t.orphanRoots > 0 || t.cycleClusters > 0) && !t.orphanClusters && (
            <div className="mt-2">
              <button
                onClick={() => props.onJumpToIssues("reporting")}
                className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Fix structural issues →
              </button>
            </div>
          )}
        </MiniPanel>
      </div>

      <div className="mt-3 text-xs text-black/40 dark:text-white/40">
        This is a mini-map. Use Org Chart for full hierarchy exploration.
      </div>
    </div>
  );
}

function MiniPanel(props: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="text-xs font-medium text-black/60 dark:text-white/60">{props.title}</div>
      <div className="mt-1 text-xs text-black/40 dark:text-white/40">{props.subtitle}</div>
      <div className="mt-3">{props.children}</div>
    </div>
  );
}

function PersonCard({
  person,
  selectable,
  selected,
  onToggle,
  onOpen,
}: {
  person: PersonRow;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  onOpen?: () => void;
}) {
  // Visual prioritization:
  // - Managers: slightly stronger surface
  // - Needs attention: outlined emphasis, not loud warnings
  const tier = person.isManager ? 0 : person.needsAttention ? 1 : 2;

  const border =
    tier === 0
      ? "border-black/20 dark:border-white/20"
      : tier === 1
        ? "border-amber-400/40 dark:border-amber-300/30"
        : "border-black/10 dark:border-white/10";

  return (
    <div className={`rounded-2xl border ${border} bg-white/60 p-4 dark:bg-white/5`}>
      <button onClick={onOpen} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1">
            {selectable ? (
              <input
                type="checkbox"
                checked={!!selected}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggle?.();
                }}
                onClick={(e) => e.stopPropagation()}
                className="mt-1 h-4 w-4 cursor-pointer"
              />
            ) : null}

            <div className="flex-1">
              <div className="text-sm font-semibold">{person.name}</div>
              <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                {(person.title || person.roleName || "Role not set")}
                {person.teamName ? ` · ${person.teamName}` : ""}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {person.isManager ? <Dot label="Manager" tone="neutral" /> : null}
            {person.needsAttention ? <Dot label="Incomplete" tone="amber" /> : <Dot label="Complete" tone="green" />}
          </div>
        </div>

        {/* Show status line (calm, single line) */}
        {person.needsAttention && (
          <div className="mt-2 text-xs text-black/50 dark:text-white/50">
            {(() => {
              const reasons: string[] = [];
              if (person.missing?.reporting) reasons.push("Missing reporting line");
              if (person.missing?.role) reasons.push("Missing role");
              if (person.missing?.team) reasons.push("Missing team");
              return reasons.length > 0 ? `Incomplete • ${reasons.join(", ")}` : "Incomplete";
            })()}
          </div>
        )}
      </button>
    </div>
  );
}

function Dot(props: { label: string; tone: "neutral" | "amber" | "green" }) {
  const tone =
    props.tone === "green"
      ? "bg-emerald-500"
      : props.tone === "amber"
        ? "bg-amber-500"
        : "bg-slate-400";

  return (
    <div className="inline-flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
      <span className={`h-2 w-2 rounded-full ${tone}`} />
      <span>{props.label}</span>
    </div>
  );
}

function MiniTag(props: { label: string }) {
  return (
    <span className="rounded-full border border-black/10 bg-white/70 px-2 py-1 text-[11px] text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
      {props.label}
    </span>
  );
}

function AddPersonModal(props: {
  people: { id: string; name: string }[];
  onClose: () => void;
  onCreate: (data: { name: string; email?: string; title?: string; roleName?: string; teamName?: string; managerId?: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [roleName, setRoleName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [managerId, setManagerId] = useState<string>("");

  const canCreate = name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold">Add person</div>
            <div className="mt-1 text-sm text-black/50 dark:text-white/50">Add factual directory details. You can refine structure later.</div>
          </div>
          <button onClick={props.onClose} className="rounded-lg border border-black/10 px-2 py-1 text-sm dark:border-white/10">
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <Field label="Full name" value={name} onChange={setName} placeholder="e.g. Alex Johnson" />
          <Field label="Email (optional)" value={email} onChange={setEmail} placeholder="alex@company.com" />
          <Field label="Title (optional)" value={title} onChange={setTitle} placeholder="e.g. Product Manager" />
          <Field label="Role (optional)" value={roleName} onChange={setRoleName} placeholder="e.g. Product Manager" />
          <Field label="Team (optional)" value={teamName} onChange={setTeamName} placeholder="e.g. Product" />
          
          <label className="text-xs text-black/50 dark:text-white/50">
            Manager (optional)
            <select
              value={managerId}
              onChange={e => setManagerId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-white/10"
            >
              <option value="">No manager</option>
              {props.people.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button onClick={props.onClose} className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
              Cancel
            </button>
            <button
              disabled={!canCreate}
              onClick={() => props.onCreate({ name, email, title, roleName, teamName, managerId: managerId || undefined })}
              className="rounded-xl bg-black px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="text-xs text-black/50 dark:text-white/50">
      {props.label}
      <input
        value={props.value}
        onChange={e => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-white/10"
      />
    </label>
  );
}

function BulkActionsDrawer(props: {
  open: boolean;
  onClose: () => void;
  orgId: string;
  selectedIds: string[];
  people: { id: string; name: string }[];
  onApplied: () => Promise<void>;
}) {
  const [managerId, setManagerId] = useState<string>("");
  const [teamName, setTeamName] = useState("");
  const [roleName, setRoleName] = useState("");
  const [loading, setLoading] = useState(false);

  async function apply(patch: any) {
    setLoading(true);
    try {
      const res = await fetch("/api/org/people/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personIds: props.selectedIds, patch }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        alert(json?.error?.message || "Bulk update failed");
        return;
      }
      await props.onApplied();
      props.onClose();
    } finally {
      setLoading(false);
    }
  }

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold">Bulk actions</div>
            <div className="mt-1 text-sm text-black/50 dark:text-white/50">
              Apply changes to {props.selectedIds.length} selected people.
            </div>
          </div>
          <button onClick={props.onClose} className="rounded-lg border border-black/10 px-2 py-1 text-sm dark:border-white/10">
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="text-xs text-black/50 dark:text-white/50">
            Assign manager
            <select
              value={managerId}
              onChange={e => setManagerId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-white/10"
            >
              <option value="">No change</option>
              <option value="__CLEAR__">Clear manager</option>
              {props.people.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <Field label="Assign team (optional)" value={teamName} onChange={setTeamName} placeholder="e.g. Engineering" />
          <Field label="Assign role (optional)" value={roleName} onChange={setRoleName} placeholder="e.g. Engineer" />

          <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
            <button
              disabled={loading}
              onClick={() => apply({
                ...(managerId === "__CLEAR__" ? { managerId: null } : managerId ? { managerId } : {}),
                ...(teamName.trim() ? { teamName: teamName.trim() } : {}),
                ...(roleName.trim() ? { roleName: roleName.trim() } : {}),
              })}
              className="rounded-xl bg-black px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {loading ? "Applying..." : "Apply changes"}
            </button>
          </div>

          <div className="text-xs text-black/40 dark:text-white/40">
            Tip: Keep changes minimal. This is meant for fast cleanup, not full profile editing.
          </div>
        </div>
      </div>
    </div>
  );
}

