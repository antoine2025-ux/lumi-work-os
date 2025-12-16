"use client";

/**
 * Org v1 – frozen read model.
 * 
 * Derived data must come from shared org/lib helpers.
 * 
 * This page represents the canonical People experience for Org v1.
 * All patterns established here should be reused across Org surfaces.
 * 
 * Key principles:
 * - State-aware rendering (empty / zero-results / populated)
 * - Focus modes (Explore vs Fix) with single primary CTA
 * - Premium hierarchy: calm, intentional, enterprise-grade
 * - Consistent spacing: space-y-6 major sections, space-y-3 internal
 */

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PersonProfileDrawer } from "./_components/PersonProfileDrawer";
import { OrgSnapshotPanel } from "./_components/OrgSnapshotPanel";
import { PeopleFiltersBar } from "./_components/PeopleFiltersBar";
import { SavedViewsModal } from "./_components/SavedViewsModal";
import { BulkActionsModal } from "./_components/BulkActionsModal";
import { ToastProvider, useToast } from "./_components/toast";
import { ErrorNotice } from "./_components/ErrorNotice";
import { PeopleSearchSortBar, SortKey } from "./_components/PeopleSearchSortBar";
import { FixQueueToggle } from "./_components/FixQueueToggle";
import { RecentChangesPanel } from "./_components/RecentChangesPanel";
import { RecentChanges } from "./_components/RecentChanges";
import { loadAudit, saveAudit, pushAudit } from "./_components/auditLog";
import { fetchAudit, writeAudit, fetchPermissions } from "./_components/auditServer";
import type { FilterKey } from "./_components/savedViews";
import { getDefaultView, loadSavedViews } from "./_components/savedViews";
import { OrgSwitcher } from "../_components/OrgSwitcher";
import { SavedViewsBar } from "./_components/SavedViewsBar";
import { PeopleIssuesTab } from "./_components/PeopleIssuesTab";
import { OrgHealthStrip } from "../_components/OrgHealthStrip";
import { OrgHealthHistory } from "../_components/OrgHealthHistory";
import { PeopleCommandBar } from "./_components/PeopleCommandBar";
import { UtilitiesDrawer } from "./_components/UtilitiesDrawer";
import { EmptyState } from "./_components/EmptyState";
import { FiltersChips } from "./_components/FiltersChips";
import { PeopleGrid } from "./_components/PeopleGrid";
import { BulkActionBar } from "./_components/BulkActionBar";
import { useKeyboardShortcuts } from "./_components/useKeyboardShortcuts";
import type { FocusMode } from "./_components/focus";
import { focusCopy } from "./_components/focus";
import { PlacePersonDrawer } from "./_components/PlacePersonDrawer";
import { EditPersonDrawer } from "./_components/EditPersonDrawer";
import { AssignManager } from "./_components/AssignManager";
import { AssignTeam } from "./_components/AssignTeam";
import { derivePeopleSignals, computeCompletenessFromSignals } from "@/lib/loopbrain/deriveSignals";
import type { LoopBrainEvent } from "@/lib/loopbrain/signals";
import { buildFixEvent, captureBeforeState, captureAfterState, determineFixType } from "@/lib/loopbrain/fixHistory";
import { computeImpactForPerson } from "@/lib/loopbrain/impact";
import { deriveCompleteness } from "@/lib/org/deriveCompleteness";
import { deriveIssues } from "@/lib/org/deriveIssues";
import { deriveCurrentAvailability } from "@/lib/org/deriveAvailability";
import { deriveEffectiveCapacity } from "@/lib/org/deriveEffectiveCapacity";
import { deriveTeamCapacity } from "@/lib/org/rollups/deriveTeamCapacity";
import { CapacityStrip } from "./_components/CapacityStrip";
import { TeamCapacityTable } from "./_components/TeamCapacityTable";

type Person = {
  id: string;
  fullName?: string;
  name?: string;
  title?: string;
  role?: string;
  teamName?: string;
  team?: string;
  managerId?: string | null;
  managerName?: string | null;
  directReportCount?: number | null;
  location?: string | null;
  archivedAt?: string | null;
  mergedIntoId?: string | null;
};

type CardVariant = "manager" | "ic" | "incomplete";

function safeName(p: Person) {
  return p.fullName || p.name || "Unnamed person";
}
function safeRole(p: Person) {
  return p.title || p.role || "Role not set";
}
function safeTeam(p: Person) {
  return p.teamName || p.team || "Team not set";
}
function isIncomplete(p: Person) {
  // Step 1: minimal definition aligned to spec — reporting line missing is the key driver
  // (later steps can expand to missing role/team, etc.)
  return !p.managerId;
}
function isManager(p: Person) {
  return (p.directReportCount ?? 0) > 0;
}
function isMissingRole(p: Person) {
  const v = (p.title || p.role || "").trim();
  return v.length === 0 || v.toLowerCase() === "role not set";
}
function isMissingTeam(p: Person) {
  const v = (p.teamName || p.team || "").trim();
  return v.length === 0 || v.toLowerCase() === "team not set";
}

function computeSuggestions(args: {
  person: Person;
  people: Person[];
  rawManagers: Person[];
}) {
  const { person, people, rawManagers } = args;

  const team = (person.teamName || person.team || "").trim();
  const missingManager = !person.managerId;
  const missingTeam = (() => {
    const v = (person.teamName || person.team || "").trim();
    return v.length === 0 || v.toLowerCase() === "team not set";
  })();

  // Compute manager pattern:
  // - If person has a team: most common manager among people in that team (excluding null)
  // - Else: manager with highest directReportCount
  let suggestedManagerId: string | undefined;
  let suggestedManagerName: string | undefined;
  let managerRationale: string | undefined;
  let confidence: number = 0.3;
  const evidence: Array<{ label: string; value: string }> = [];

  if (missingManager) {
    if (team) {
      const counts = new Map<string, number>();
      const names = new Map<string, string>();
      for (const p of people) {
        const pt = (p.teamName || p.team || "").trim();
        if (pt !== team) continue;
        if (!p.managerId) continue;
        counts.set(p.managerId, (counts.get(p.managerId) ?? 0) + 1);
        if (p.managerName) names.set(p.managerId, p.managerName);
      }
      let best: { id: string; n: number } | null = null;
      for (const [id, n] of counts.entries()) {
        if (!best || n > best.n) best = { id, n };
      }
      if (best) {
        suggestedManagerId = best.id;
        suggestedManagerName = names.get(best.id);
        const peers = counts.size;
        managerRationale = `Most common manager among ${peers} peers in the same team.`;
        confidence = Math.min(0.95, 0.55 + Math.min(0.35, peers * 0.05));
        evidence.push({ label: "Team", value: team });
        evidence.push({ label: "Peers used", value: String(peers) });
        evidence.push({ label: "Proposed manager", value: suggestedManagerName || suggestedManagerId });
      }
    }

    if (!suggestedManagerId) {
      // Top manager by directReportCount
      let best = rawManagers
        .filter((m) => (m.directReportCount ?? 0) > 0)
        .slice()
        .sort((a, b) => (b.directReportCount ?? 0) - (a.directReportCount ?? 0))[0];

      if (best) {
        suggestedManagerId = best.id;
        suggestedManagerName = safeName(best);
        managerRationale = "Highest span-of-control manager (fallback).";
      }
    }
  }

  // Compute team pattern:
  // - If person has a manager: most common team among people with same manager
  // - Else: most common team in dataset (excluding empty)
  let suggestedTeamName: string | undefined;
  let teamRationale: string | undefined;

  if (missingTeam) {
    const mgrId = person.managerId || suggestedManagerId;
    if (mgrId) {
      const counts = new Map<string, number>();
      for (const p of people) {
        if (p.managerId !== mgrId) continue;
        const pt = (p.teamName || p.team || "").trim();
        if (!pt || pt.toLowerCase() === "team not set") continue;
        counts.set(pt, (counts.get(pt) ?? 0) + 1);
      }
      let best: { name: string; n: number } | null = null;
      for (const [name, n] of counts.entries()) {
        if (!best || n > best.n) best = { name, n };
      }
      if (best) {
        suggestedTeamName = best.name;
        teamRationale = "Most common team among people with the same manager.";
      }
    }

    if (!suggestedTeamName) {
      const counts = new Map<string, number>();
      for (const p of people) {
        const pt = (p.teamName || p.team || "").trim();
        if (!pt || pt.toLowerCase() === "team not set") continue;
        counts.set(pt, (counts.get(pt) ?? 0) + 1);
      }
      let best: { name: string; n: number } | null = null;
      for (const [name, n] of counts.entries()) {
        if (!best || n > best.n) best = { name, n };
      }
      if (best) {
        suggestedTeamName = best.name;
        teamRationale = "Most common team in dataset (fallback).";
      }
    }
  }

  const rationaleParts = [managerRationale, teamRationale].filter(Boolean);

  if (!team) {
    evidence.push({ label: "Team", value: "Missing" });
  }
  if (!person.title && !person.role) {
    evidence.push({ label: "Role/title", value: "Missing" });
  }

  return {
    managerId: suggestedManagerId,
    managerName: suggestedManagerName,
    teamName: suggestedTeamName,
    rationale: rationaleParts.length ? rationaleParts.join(" ") : undefined,
    confidence,
    evidence,
  };
}

function StatusDot({
  tone,
  title,
}: {
  tone: "green" | "amber";
  title: string;
}) {
  const base =
    "inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white/70 dark:ring-black/30";
  const toneCls =
    tone === "green"
      ? "bg-emerald-500"
      : "bg-amber-500";
  return <span className={`${base} ${toneCls}`} title={title} aria-label={title} />;
}

function PrimaryButton({
  label,
  onClick,
  variant,
}: {
  label: string;
  onClick: () => void;
  variant: "primary" | "ghost";
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent";
  const cls =
    variant === "primary"
      ? "bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 focus:ring-black/30 dark:focus:ring-white/30"
      : "bg-transparent text-black/70 hover:text-black hover:bg-black/5 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10 focus:ring-black/20 dark:focus:ring-white/20";

  return (
    <button type="button" className={`${base} ${cls}`} onClick={onClick}>
      {label}
    </button>
  );
}

function PersonCard({
  person,
  variant,
  onPrimary,
  isActive = false,
  issueAge,
}: {
  person: Person;
  variant: CardVariant;
  onPrimary: (p: Person, focus?: "quickFix" | "default") => void;
  isActive?: boolean;
  issueAge?: number | null;
}) {
  const name = safeName(person);
  const role = safeRole(person);
  const team = safeTeam(person);

  const incomplete = variant === "incomplete";
  const manager = variant === "manager";

  // Visual hierarchy:
  // - Manager: slightly larger, filled, stronger
  // - IC: quiet filled
  // - Incomplete: outlined, subtle amber border, no loud content
  const containerBase =
    "group relative rounded-2xl p-4 shadow-sm transition hover:shadow-md";
  const containerTone = incomplete
    ? "bg-transparent border border-amber-300/60 dark:border-amber-400/30"
    : manager
      ? "bg-white dark:bg-white/5 border border-black/5 dark:border-white/10"
      : "bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10";

  const sizeCls = manager ? "min-h-[132px]" : "min-h-[118px]";
  const nameCls = manager
    ? "text-[15px] font-semibold tracking-[-0.01em] text-black dark:text-white"
    : "text-[14px] font-semibold tracking-[-0.01em] text-black dark:text-white";

  const metaCls =
    "text-xs text-black/60 dark:text-white/60 leading-5";
  const metaQuiet =
    "text-xs text-black/45 dark:text-white/45 leading-5";

  const statusTitle = incomplete
    ? "Org status: Incomplete — missing reporting line"
    : "Org status: Complete";
  const dotTone = incomplete ? "amber" : "green";

  const primaryLabel =
    variant === "manager" ? "Explore reporting" : variant === "incomplete" ? "Fix now" : "View profile";

  const showSpan =
    typeof person.directReportCount === "number" ? person.directReportCount : null;

  const agingDays = issueAge !== undefined ? issueAge : null;

  return (
    <div className={`${containerBase} ${containerTone} ${sizeCls} ${isActive ? "ring-2 ring-black/10 dark:ring-white/15" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusDot tone={dotTone} title={statusTitle} />
            <div className="min-w-0">
              <div className={`${nameCls} truncate`}>{name}</div>
            </div>
            {incomplete && agingDays !== null ? (
              <span className="inline-flex items-center rounded-full border border-amber-300/60 bg-amber-50/60 px-2 py-0.5 text-xs text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300">
                Aging: {agingDays}d
              </span>
            ) : null}
          </div>

          <div className="mt-2 space-y-1">
            <div className={metaCls}>{role}</div>
            <div className={metaQuiet}>{team}</div>
            {person.location ? (
              <div className={metaQuiet}>{person.location}</div>
            ) : null}
            {variant === "manager" && showSpan !== null ? (
              <div className={metaCls}>
                Span of control: <span className="text-black/80 dark:text-white/80">{showSpan}</span>
              </div>
            ) : null}
            {variant === "incomplete" ? (
              <div className="mt-1 text-xs text-black/60 dark:text-white/60">
                Status: <span className="font-medium text-black/80 dark:text-white/80">Incomplete</span>
                <span className="ml-2 text-black/45 dark:text-white/45" title="Missing reporting line. Full details available in the profile drawer.">
                  (reason on hover)
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Primary action only (dominant) */}
        <div className="shrink-0">
          <PrimaryButton
            label={primaryLabel}
            onClick={() => onPrimary(person, variant === "incomplete" ? "quickFix" : "default")}
            variant="primary"
          />
        </div>
      </div>

      {/* Secondary actions: hidden by default, only appear on hover (future steps can wire) */}
      <div className="mt-3 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
        {variant === "incomplete" ? (
          <PrimaryButton
            label="Quick fix"
            onClick={() => onPrimary(person, "quickFix")}
            variant="ghost"
          />
        ) : null}
        <PrimaryButton
          label="Assign manager"
          onClick={() => onPrimary(person)}
          variant="ghost"
        />
        <PrimaryButton
          label="Edit role"
          onClick={() => onPrimary(person)}
          variant="ghost"
        />
      </div>
    </div>
  );
}

function IssuesBanner({
  countMissingReporting,
  onClickReview,
}: {
  countMissingReporting: number;
  onClickReview: () => void;
}) {
  return (
    <div className="mb-4 rounded-2xl border border-amber-300/60 bg-amber-50/60 p-4 shadow-sm dark:border-amber-400/30 dark:bg-amber-400/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-black/90 dark:text-white/90">
            Org issues detected
          </div>
          <div className="mt-1 text-sm text-black/70 dark:text-white/70">
            {countMissingReporting} people missing reporting lines
            <span className="text-black/50 dark:text-white/50"> →</span>{" "}
            <button
              type="button"
              onClick={onClickReview}
              className="font-medium text-black underline decoration-black/30 underline-offset-4 hover:decoration-black/60 dark:text-white dark:decoration-white/30 dark:hover:decoration-white/60"
            >
              Review
            </button>
          </div>
        </div>
        <div className="text-xs text-black/50 dark:text-white/50">
          Signals are collapsed to reduce noise.
        </div>
      </div>
    </div>
  );
}

function OrgPeoplePageInner() {
  const { push } = useToast();
  const router = useRouter();
  const sp = useSearchParams();
  const tab = sp.get("tab") || "people";
  const issueTypeFromUrl = sp.get("issues");
  const viewKey = sp.get("view");
  const setTab = (t: "people" | "issues") => {
    const next = new URLSearchParams(sp.toString());
    next.set("tab", t);
    router.push(`?${next.toString()}`);
  };
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Person | null>(null);
  const [snapshotOpen, setSnapshotOpen] = useState<boolean>(false);
  const [snapshotTouched, setSnapshotTouched] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());
  const [savedViewsOpen, setSavedViewsOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [defaultApplied, setDefaultApplied] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [audit, setAudit] = useState<Array<{ id: string; action: string; ts: number; actor: string; targetCount: number; summary: string }>>(() => []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canEdit, setCanEdit] = useState(true);
  const [role, setRole] = useState<string>("editor");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("nameAsc");
  const [fixQueue, setFixQueue] = useState(false);
  const [drawerFocus, setDrawerFocus] = useState<"quickFix" | "default">("default");
  const [fatalError, setFatalError] = useState<{ title: string; message: string } | null>(null);
  const [views, setViews] = useState<any[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [didHydrateDefaultView, setDidHydrateDefaultView] = useState(false);
  // Issues are derived from people state - no stored state needed (Golden Rule: Problems Are Views, Not States)
  const [savedView, setSavedView] = useState<{ key: string; title: string; config: any } | null>(null);
  const [isDefaultView, setIsDefaultView] = useState(false);
  const [focusMode, setFocusMode] = useState<FocusMode>("explore");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const previousFocusModeRef = useRef<FocusMode>("explore");
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [editPersonOpen, setEditPersonOpen] = useState(false);
  const [assignManagerOpen, setAssignManagerOpen] = useState(false);
  const [assignTeamOpen, setAssignTeamOpen] = useState(false);
  const [assignPerson, setAssignPerson] = useState<Person | null>(null);
  const [orgSignals, setOrgSignals] = useState<LoopBrainEvent[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Redirect to default view on first load if no explicit params
  useEffect(() => {
    const hasExplicitParams = sp.get("tab") || sp.get("view") || sp.get("issues");
    if (!hasExplicitParams && !loading && people.length >= 0) {
      let redirected = false;
      (async () => {
        try {
          const res = await fetch("/api/org/default-view", { cache: "no-store" });
          const data = await res.json().catch(() => null);
          if (data?.ok && data.viewKey && !redirected) {
            redirected = true;
            router.replace(`/org/people?tab=issues&view=${data.viewKey}`);
          }
        } catch (error) {
          // Ignore errors, let page load normally
        }
      })();
    }
  }, [sp, loading, people.length, router]);

  // Fetch orgId
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/org/context", { cache: "no-store" });
        const data = await res.json().catch(() => ({} as any));
        if (data?.ok && data.orgId) {
          setOrgId(data.orgId);
        }
      } catch (error) {
        console.warn("Failed to load org context:", error);
      }
    })();
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/org/people", { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;
        
        if (res.status === 401) {
          // User not authenticated - this should be handled by auth layer
          console.warn("Not authenticated");
          setPeople([]);
          setFatalError({ 
            title: "Authentication required", 
            message: "Please sign in to access this page." 
          });
        } else if (res.status === 403 || data?.noOrgMembership) {
          // User authenticated but no org membership
          console.warn("No organization membership");
          setPeople([]);
          setFatalError({ 
            title: "Organization membership required", 
            message: "You need to be a member of an organization to view this page." 
          });
        } else if (res.ok && Array.isArray(data)) {
          setPeople(data);
          // Derive signals from loaded people
          const signals = derivePeopleSignals(data);
          setOrgSignals(signals);
        } else if (res.ok && data?.people) {
          const loadedPeople = Array.isArray(data.people) ? data.people : [];
          setPeople(loadedPeople);
          // Derive signals from loaded people
          const signals = derivePeopleSignals(loadedPeople);
          setOrgSignals(signals);
        } else {
          setPeople([]);
          setOrgSignals([]);
        }

        // Fetch projects for allocation dropdown
        const projectsRes = await fetch("/api/org/projects", { cache: "no-store" });
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          if (projectsData?.ok && Array.isArray(projectsData.projects)) {
            setProjects(projectsData.projects.map((p: any) => ({ id: p.id, name: p.name })));
          }
        }
      } catch (error) {
        console.error("Error loading people:", error);
        if (!alive) return;
        setPeople([]);
        setFatalError({ 
          title: "Error loading data", 
          message: "Failed to load people. Please try again." 
        });
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (defaultApplied) return;
    // Wait until initial load completes (people loaded or confirmed empty)
    if (loading) return;

    // Load default view from API
    (async () => {
      try {
        const res = await fetch("/api/org/views?scope=people");
        const data = await res.json();
        if (data?.ok && Array.isArray(data.views)) {
          // Convert server views to client format
          const clientViews = data.views.map((v: any) => ({
            id: v.id,
            name: v.name,
            filters: (v.state?.filters || []) as FilterKey[],
            createdAt: new Date(v.createdAt).getTime(),
            updatedAt: new Date(v.updatedAt).getTime(),
            isDefault: v.state?.isDefault || false,
            shared: v.shared || false,
          }));
          const def = getDefaultView(clientViews);
          if (def && Array.isArray(def.filters)) {
            setActiveFilters(new Set(def.filters));
          }
        }
      } catch (error) {
        // Fallback to localStorage if API fails
        const views = loadSavedViews();
        const def = getDefaultView(views);
        if (def && Array.isArray(def.filters)) {
          setActiveFilters(new Set(def.filters));
        }
      }
      setDefaultApplied(true);
    })();
  }, [loading, defaultApplied]);

  useEffect(() => {
    (async () => {
      try {
        const p = await fetchPermissions();
        setCanEdit(p.canEdit);
        setRole(p.role);
      } catch (error) {
        // If permissions fetch fails due to no org membership, set read-only
        console.warn("Failed to fetch permissions:", error);
        setCanEdit(false);
        setRole("viewer");
      }
    })();
  }, []);

  // Auto-select Issues tab and filter when coming from guidance
  useEffect(() => {
    if (issueTypeFromUrl && tab !== "issues") {
      const next = new URLSearchParams(sp.toString());
      next.set("tab", "issues");
      router.push(`?${next.toString()}`);
    }
  }, [issueTypeFromUrl, tab, sp, router]);

  // Load saved view when viewKey is present
  useEffect(() => {
    if (viewKey) {
      (async () => {
        try {
          const res = await fetch("/api/org/views", { cache: "no-store" });
          const data = await res.json().catch(() => null);
          if (data?.ok && Array.isArray(data.views)) {
            const view = data.views.find((v: any) => v.key === viewKey);
            if (view) {
              setSavedView({ key: view.key, title: view.title, config: view.config });
              // Auto-select Issues tab if not already
              if (tab !== "issues") {
                const next = new URLSearchParams(sp.toString());
                next.set("tab", "issues");
                router.push(`?${next.toString()}`);
              }
            }
          }
        } catch (error) {
          console.warn("Failed to load saved view:", error);
        }
      })();
    } else {
      setSavedView(null);
      setIsDefaultView(false);
    }
  }, [viewKey, tab, sp, router]);

  // Check if this is the default view for user's role
  useEffect(() => {
    if (viewKey && !sp.get("tab") && !sp.get("issues")) {
      (async () => {
        try {
          const res = await fetch("/api/org/default-view", { cache: "no-store" });
          const data = await res.json().catch(() => null);
          if (data?.ok && data.viewKey === viewKey) {
            setIsDefaultView(true);
          }
        } catch (error) {
          // Ignore errors
        }
      })();
    }
  }, [viewKey, sp]);

  useEffect(() => {
    fetch("/api/org/views?scope=people")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) {
          setViews(d.views || []);
        }
      })
      .catch((error) => {
        console.warn("Failed to load saved views:", error);
      });
  }, []);

  useEffect(() => {
    if (didHydrateDefaultView) return;
    if (!views.length) return;

    const roleKey = (role || "VIEWER").toUpperCase();
    const def = views.find((v) => v.defaultForRole === roleKey) || null;

    if (def) applyView(def);
    setDidHydrateDefaultView(true);
  }, [views, role, didHydrateDefaultView]);

  useEffect(() => {
    (async () => {
      const server = await fetchAudit();
      if (server.length > 0) {
        setAudit(server);
      } else {
        // fallback: keep previous session-only entries if any
        const loaded = loadAudit();
        setAudit(loaded);
      }
    })();
  }, []);

  function toggleFilter(k: FilterKey) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function clearFilters() {
    setActiveFilters(new Set());
  }

  function resetFilters() {
    setActiveFilters(new Set());
    setQuery("");
    setFixQueue(false);
  }

  async function addAudit(entry: { action: string; targetCount: number; summary: string }) {
    const nextEntry = pushAudit({ actor: "you", ...entry });

    setAudit((prev) => {
      const next = [nextEntry, ...prev].slice(0, 50);
      saveAudit(next); // keep local mirror for instant UI + fallback
      return next;
    });

    // Note: Server-side mutation endpoints now record audit automatically.
    // This local append is for instant UI feedback; server audit is authoritative.
    // Optional: refresh audit list in background after mutations (best-effort).
  }

  function clearAudit() {
    setAudit([]);
    saveAudit([]);
  }

  const derived = useMemo(() => {
    const total = people.length || 0;
    const rawMissingReporting = people.filter(isIncomplete);
    const rawManagers = people.filter((p) => !isIncomplete(p) && isManager(p));
    const rawICs = people.filter((p) => !isIncomplete(p) && !isManager(p));

    // Health (using canonical derivation - Golden Rule: Derived, Not Stored)
    const completeness = deriveCompleteness(people);
    const reportingComplete = completeness.reportingLines;
    const rolesComplete = completeness.roles;
    const teamsComplete = completeness.teams;
    const overall = Math.round((reportingComplete + rolesComplete + teamsComplete) / 3);
    
    // Issue counts (using canonical derivation)
    const issues = deriveIssues(people);
    const missingRoleCount = issues.filter(i => i.issues.includes("MISSING_ROLE")).length;
    const missingTeamCount = issues.filter(i => i.issues.includes("MISSING_TEAM")).length;

    // Filter counts (based on full dataset)
    const counts = {
      missingReporting: rawMissingReporting.length,
      missingRole: missingRoleCount,
      missingTeam: missingTeamCount,
      managersOnly: rawManagers.length,
      needsAttention: rawMissingReporting.length + missingRoleCount + missingTeamCount,
    } as const;

    // Apply filters
    const needsAttentionSet = new Set<string>([
      ...rawMissingReporting.map((p) => p.id),
      ...people.filter(isMissingRole).map((p) => p.id),
      ...people.filter(isMissingTeam).map((p) => p.id),
    ]);

    function passes(p: Person) {
      if (activeFilters.size === 0) return true;
      // AND semantics: all active filters must pass
      for (const f of activeFilters) {
        if (f === "missingReporting" && !isIncomplete(p)) return false;
        if (f === "missingRole" && !isMissingRole(p)) return false;
        if (f === "missingTeam" && !isMissingTeam(p)) return false;
        if (f === "managersOnly" && !isManager(p)) return false;
        if (f === "needsAttention" && !needsAttentionSet.has(p.id)) return false;
      }
      return true;
    }

    const filteredMissingReporting = rawMissingReporting.filter(passes);
    const filteredManagers = rawManagers.filter(passes);
    const filteredICs = rawICs.filter(passes);

    return {
      total,
      // raw buckets for banners/health
      rawMissingReporting,
      rawManagers,
      rawICs,
      // filtered buckets for rendering
      missingReporting: filteredMissingReporting,
      managers: filteredManagers,
      ics: filteredICs,
      countMissingReporting: rawMissingReporting.length,
      counts,
      health: {
        overall,
        reportingComplete,
        rolesComplete,
        teamsComplete,
      },
    };
  }, [people, activeFilters]);

  useEffect(() => {
    // Contextual auto-open: only if user hasn't manually overridden.
    if (!snapshotTouched) {
      setSnapshotOpen(derived.countMissingReporting > 0);
    }
  }, [derived.countMissingReporting, snapshotTouched]);

  function handlePrimary(person: Person, focus: "quickFix" | "default" = "default") {
    setSelected(person);
    setDrawerFocus(focus);
    setDrawerOpen(true);
  }

  function handleOpen(person: Person) {
    setSelected(person);
    setEditPersonOpen(true);
  }

  function handleQuickFix(person: Person) {
    setAssignPerson(person);
    // Determine which assignment to show based on what's missing
    if (!person.managerId) {
      setAssignManagerOpen(true);
    } else if (!(person.teamName || person.team)) {
      setAssignTeamOpen(true);
    } else {
      // Default to manager assignment
      setAssignManagerOpen(true);
    }
  }

  function toggleFocus() {
    setFocusMode((m) => {
      const next = m === "explore" ? "fix" : "explore";
      return next;
    });
  }

  function handlePrimaryAction() {
    if (focusMode === "explore") {
      // Open place person drawer
      setAddPersonOpen(true);
    } else {
      // Resolve selected issues
      resolveSelectedIssues();
    }
  }

  async function handleCreatePerson(personData: {
    name: string;
    role?: string;
    managerId?: string;
    teamId?: string;
    teamName?: string;
  }) {
    if (!canEdit) {
      push({ tone: "info", title: "Read-only", message: "You don't have permission to add people." });
      return;
    }

    if (!personData.name?.trim()) {
      push({ tone: "error", title: "Name required", message: "Please provide a name." });
      return;
    }

    try {
      // Find team name from teamId if provided
      const teamName = personData.teamId
        ? teamOptions.find((t) => t.name === personData.teamId)?.name
        : personData.teamName;

      // Optimistic update
      const newPerson: Person = {
        id: `temp-${Date.now()}`,
        name: personData.name,
        fullName: personData.name,
        title: personData.role || undefined,
        role: personData.role || undefined,
        teamName: teamName || undefined,
        team: teamName || undefined,
        managerId: personData.managerId || null,
        managerName: personData.managerId
          ? people.find((p) => p.id === personData.managerId)?.name || null
          : null,
        directReportCount: null,
        location: null,
        archivedAt: null,
        mergedIntoId: null,
      };

      setPeople((prev) => [...prev, newPerson]);

      // Create via API (using positions endpoint)
      const res = await fetch("/api/org/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: personData.role || null, // Now nullable
          teamId: personData.teamId || null,
          parentId: personData.managerId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Rollback optimistic update
        setPeople((prev) => prev.filter((p) => p.id !== newPerson.id));
        push({
          tone: "error",
          title: "Failed to place person",
          message: data?.error || "Could not place person in organization.",
        });
        return;
      }

      // Reload people list to get server state
      const reloadRes = await fetch("/api/org/people", { cache: "no-store" });
      const reloadData = await reloadRes.json();
      if (reloadRes.ok && reloadData?.ok && Array.isArray(reloadData.people)) {
        setPeople(reloadData.people);
      } else if (reloadRes.ok && Array.isArray(reloadData)) {
        setPeople(reloadData);
      }

      push({
        tone: "success",
        title: "Person placed",
        message: `${personData.name} has been placed in your organization.`,
      });

                  // Issues will update automatically when people state changes (derived view)
    } catch (error) {
      console.error("Failed to create person:", error);
      // Rollback optimistic update on error
      setPeople((prev) => prev.filter((p) => p.id?.startsWith("temp-")));
      push({
        tone: "error",
        title: "Failed to place person",
        message: "Could not place person in organization.",
      });
    }
  }

  async function handleSavePerson(data: {
    id: string;
    name?: string;
    role?: string;
    teamId?: string;
    teamName?: string;
    managerId?: string | null;
  }) {
    if (!canEdit) {
      push({ tone: "info", title: "Read-only", message: "You don't have permission to edit." });
      return;
    }

    try {
      // Optimistic update
      applyOptimisticPatch(data.id, {
        managerId: data.managerId,
        managerName: data.managerId
          ? people.find((p) => p.id === data.managerId)?.name || null
          : null,
        teamName: data.teamName || (data.teamId ? teamOptions.find((t) => t.name === data.teamId)?.name : undefined),
      });

      // Update name/role if provided
      if (data.name !== undefined || data.role !== undefined) {
        setPeople((prev) =>
          prev.map((p) =>
            p.id === data.id
              ? {
                  ...p,
                  ...(data.name !== undefined ? { name: data.name, fullName: data.name } : {}),
                  ...(data.role !== undefined ? { title: data.role, role: data.role } : {}),
                }
              : p
          )
        );
      }

      const res = await fetch("/api/org/people/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: data.id,
          patch: {
            managerId: data.managerId,
            teamName: data.teamName || (data.teamId ? teamOptions.find((t) => t.name === data.teamId)?.name : undefined),
          },
        }),
      });

      if (!res.ok) {
        // Reload from server on error
        const reloadRes = await fetch("/api/org/people", { cache: "no-store" });
        const reloadData = await reloadRes.json();
        if (reloadRes.ok && reloadData?.ok && Array.isArray(reloadData.people)) {
          setPeople(reloadData.people);
        } else if (reloadRes.ok && Array.isArray(reloadData)) {
          setPeople(reloadData);
        }
        push({ tone: "error", title: "Update failed", message: "Could not save changes." });
        return;
      }

      push({ tone: "success", title: "Saved", message: "Person updated." });
      // Reload from server on success
      const reloadRes = await fetch("/api/org/people", { cache: "no-store" });
      const reloadData = await reloadRes.json();
      if (reloadRes.ok && reloadData?.ok && Array.isArray(reloadData.people)) {
        setPeople(reloadData.people);
      } else if (reloadRes.ok && Array.isArray(reloadData)) {
        setPeople(reloadData);
      }
                  // Issues will update automatically when people state changes (derived view)
    } catch (error) {
      console.error("Failed to save person:", error);
      // Reload from server on error
      const reloadRes = await fetch("/api/org/people", { cache: "no-store" });
      const reloadData = await reloadRes.json();
      if (reloadRes.ok && reloadData?.ok && Array.isArray(reloadData.people)) {
        setPeople(reloadData.people);
      } else if (reloadRes.ok && Array.isArray(reloadData)) {
        setPeople(reloadData);
      }
      push({ tone: "error", title: "Update failed", message: "Could not save changes." });
    }
  }

  async function handleAssignManager(personId: string, managerId: string | null, managerName: string | null) {
    if (!canEdit) {
      push({ tone: "info", title: "Read-only", message: "You don't have permission to edit." });
      return;
    }

    try {
      // Optimistic update
      applyOptimisticPatch(personId, {
        managerId,
        managerName: managerName || null,
      });

      const res = await fetch("/api/org/people/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: personId,
          patch: { managerId, managerName: managerName || null },
        }),
      });

      if (!res.ok) {
        const reloadRes = await fetch("/api/org/people", { cache: "no-store" });
        const reloadData = await reloadRes.json();
        if (reloadRes.ok && reloadData?.ok && Array.isArray(reloadData.people)) {
          setPeople(reloadData.people);
        } else if (reloadRes.ok && Array.isArray(reloadData)) {
          setPeople(reloadData);
        }
        push({ tone: "error", title: "Update failed", message: "Could not save changes." });
        return;
      }

      push({ tone: "success", title: "Saved", message: "Manager assigned." });
      const reloadRes = await fetch("/api/org/people", { cache: "no-store" });
      const reloadData = await reloadRes.json();
      if (reloadRes.ok && reloadData?.ok && Array.isArray(reloadData.people)) {
        setPeople(reloadData.people);
      } else if (reloadRes.ok && Array.isArray(reloadData)) {
        setPeople(reloadData);
      }
                  // Issues will update automatically when people state changes (derived view)
      setAssignManagerOpen(false);
      setAssignPerson(null);
    } catch (error) {
      console.error("Failed to assign manager:", error);
      const reloadRes = await fetch("/api/org/people", { cache: "no-store" });
      const reloadData = await reloadRes.json();
      if (reloadRes.ok && reloadData?.ok && Array.isArray(reloadData.people)) {
        setPeople(reloadData.people);
      } else if (reloadRes.ok && Array.isArray(reloadData)) {
        setPeople(reloadData);
      }
      push({ tone: "error", title: "Update failed", message: "Could not save changes." });
    }
  }

  async function handleAssignTeam(personId: string, teamId: string | undefined, teamName: string | undefined) {
    if (!canEdit) {
      push({ tone: "info", title: "Read-only", message: "You don't have permission to edit." });
      return;
    }

    try {
      const finalTeamName = teamName || (teamId ? teamOptions.find((t) => t.name === teamId)?.name : undefined);
      
      // Optimistic update
      applyOptimisticPatch(personId, {
        teamName: finalTeamName,
      });

      const res = await fetch("/api/org/people/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: personId,
          patch: { teamName: finalTeamName },
        }),
      });

      if (!res.ok) {
        const reloadRes = await fetch("/api/org/people", { cache: "no-store" });
        const reloadData = await reloadRes.json();
        if (reloadRes.ok && reloadData?.ok && Array.isArray(reloadData.people)) {
          setPeople(reloadData.people);
        } else if (reloadRes.ok && Array.isArray(reloadData)) {
          setPeople(reloadData);
        }
        push({ tone: "error", title: "Update failed", message: "Could not save changes." });
        return;
      }

      push({ tone: "success", title: "Saved", message: "Team assigned." });
      const reloadRes = await fetch("/api/org/people", { cache: "no-store" });
      const reloadData = await reloadRes.json();
      if (reloadRes.ok && reloadData?.ok && Array.isArray(reloadData.people)) {
        setPeople(reloadData.people);
      } else if (reloadRes.ok && Array.isArray(reloadData)) {
        setPeople(reloadData);
      }
                  // Issues will update automatically when people state changes (derived view)
      setAssignTeamOpen(false);
      setAssignPerson(null);
    } catch (error) {
      console.error("Failed to assign team:", error);
      const reloadRes = await fetch("/api/org/people", { cache: "no-store" });
      const reloadData = await reloadRes.json();
      if (reloadRes.ok && reloadData?.ok && Array.isArray(reloadData.people)) {
        setPeople(reloadData.people);
      } else if (reloadRes.ok && Array.isArray(reloadData)) {
        setPeople(reloadData);
      }
      push({ tone: "error", title: "Update failed", message: "Could not save changes." });
    }
  }


  function resolveSelectedIssues() {
    if (selectedIds.size === 0) {
      push({ tone: "info", title: "No selection", message: "Please select people to resolve." });
      return;
    }
    // Open bulk actions modal or apply fixes
    if (canBulk) {
      setBulkOpen(true);
    } else {
      push({ tone: "info", title: "Bulk actions", message: "Select people with issues to resolve." });
    }
  }

  function handleToggleSelect(person: Person) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(person.id)) {
        next.delete(person.id);
      } else {
        next.add(person.id);
      }
      return next;
    });
  }

  function handleClearSelection() {
    setSelectedIds(new Set());
  }

  // Auto-switch to fix mode when navigating to Issues tab
  useEffect(() => {
    if (tab === "issues") {
      // Save current mode if switching to issues tab and we're in explore mode
      if (focusMode === "explore") {
        previousFocusModeRef.current = "explore";
        setFocusMode("fix");
      }
    } else if (tab === "people") {
      // Restore previous mode when switching back to people tab
      if (focusMode === "fix" && previousFocusModeRef.current === "explore") {
        setFocusMode("explore");
      }
    }
  }, [tab, focusMode]); // Depend on both tab and focusMode to detect changes

  // Wire keyboard shortcuts
  useKeyboardShortcuts({
    onToggleFocus: toggleFocus,
    onPrimaryAction: handlePrimaryAction,
  });


  function handleEditRole(p: Person) {
    setSelected(p);
    setDrawerOpen(true);
  }

  const filteredSet = useMemo(() => {
    const map = new Map<string, Person>();
    for (const p of derived.managers) map.set(p.id, p);
    for (const p of derived.ics) map.set(p.id, p);
    for (const p of derived.missingReporting) map.set(p.id, p);

    let arr = Array.from(map.values());

    if (fixQueue) {
      arr = arr.filter((p) => !p.managerId);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter((p) => {
        const name = safeName(p).toLowerCase();
        const role = (p.title || p.role || "").toLowerCase();
        const team = (p.teamName || p.team || "").toLowerCase();
        return name.includes(q) || role.includes(q) || team.includes(q);
      });
    }

    // Sorting
    arr = arr.slice().sort((a, b) => {
      if (sort === "nameAsc") return safeName(a).localeCompare(safeName(b));
      if (sort === "nameDesc") return safeName(b).localeCompare(safeName(a));
      if (sort === "teamAsc") return (safeTeam(a)).localeCompare(safeTeam(b));
      if (sort === "teamDesc") return (safeTeam(b)).localeCompare(safeTeam(a));
      if (sort === "reportsDesc") return (b.directReportCount ?? 0) - (a.directReportCount ?? 0);
      // issuesFirst
      const ai = !a.managerId ? 1 : 0;
      const bi = !b.managerId ? 1 : 0;
      return bi - ai;
    });

    return arr;
  }, [derived.managers, derived.ics, derived.missingReporting, fixQueue, query, sort]);

  // Page state hierarchy
  const hasPeople = people.length > 0;
  const hasActiveFilters = activeFilters.size > 0 || query.trim().length > 0;
  const isEmptyOrg = !hasPeople && !loading;
  const isZeroResults = hasPeople && !loading && filteredSet.length === 0 && (hasActiveFilters || fixQueue);
  const isPopulated = hasPeople && !loading && filteredSet.length > 0;

  const canBulk = canEdit && activeFilters.size > 0 && filteredSet.length > 0;
  const isUnifiedView = fixQueue || query.trim().length > 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [filteredSet.length, query, fixQueue, sort, activeFilters]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs/selects/textareas
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || tag === "select" || (t as any)?.isContentEditable;
      if (isTyping) return;

      if (!isUnifiedView && !fixQueue) return;
      if (filteredSet.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(filteredSet.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const p = filteredSet[activeIndex];
        if (!p) return;
        const focus = !p.managerId ? "quickFix" : "default";
        handlePrimary(p, focus);
      } else if (e.key === "Escape") {
        if (drawerOpen) {
          e.preventDefault();
          setDrawerOpen(false);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isUnifiedView, fixQueue, filteredSet, activeIndex, drawerOpen, handlePrimary]);

  const selectedSuggestions = useMemo(() => {
    if (!selected) return undefined;
    return computeSuggestions({
      person: selected,
      people,
      rawManagers: derived.rawManagers ?? [],
    });
  }, [selected, people, derived.rawManagers]);

  const computeSuggestionsForPerson = (p: Person) =>
    computeSuggestions({ person: p, people, rawManagers: derived.rawManagers ?? [] });

  function openFromIssues(p: Person) {
    handlePrimary(p, "quickFix");
  }

  async function bulkAssignManager(args: { ids: string[]; managerId: string | null; managerName?: string | null }) {
    if (!canEdit) return;
    // Reuse existing bulk endpoint - call the handler directly
    try {
      // Capture before states
      const beforeStates = new Map<string, Record<string, any>>();
      for (const id of args.ids) {
        const person = people.find((p) => p.id === id);
        if (person) {
          beforeStates.set(id, captureBeforeState(person));
        }
      }

      const res = await fetch("/api/org/people/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: args.ids,
          patch: { managerId: args.managerId, managerName: args.managerName || null },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        push({ tone: "error", title: "Failed", message: data?.error ?? "Could not apply bulk changes." });
        return;
      }
      // Optimistic update
      for (const id of args.ids) {
        applyOptimisticPatch(id, { managerId: args.managerId, managerName: args.managerName || null });
      }

      // Log fix events for each person (non-blocking)
      if (orgId) {
        for (const id of args.ids) {
          const personBefore = people.find((p) => p.id === id);
          if (!personBefore) continue;
          
          const beforeState = beforeStates.get(id);
          const personAfter = { ...personBefore, managerId: args.managerId, managerName: args.managerName || null };
          const afterState = captureAfterState(personAfter);
          
          const impact = computeImpactForPerson({
            person: personAfter,
            signals: orgSignals,
            directReportCount: personAfter.directReportCount || 0,
          });

          const fixEvent = buildFixEvent({
            orgId,
            personId: id,
            fixType: "ASSIGN_MANAGER",
            beforeState: beforeState || captureBeforeState(personBefore),
            afterState,
            impactScore: impact.score,
          });

          fetch("/api/org/fix-events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fixEvent),
          }).catch((error) => {
            console.warn("Failed to log fix event:", error);
          });
        }
      }

      addAudit({
        action: "bulk_update_manager",
        targetCount: args.ids.length,
        summary: `Bulk assigned manager to ${args.ids.length} people`,
      });
      push({ tone: "success", title: "Bulk applied", message: `Updated ${args.ids.length} people.` });
      // Issues will update automatically when people state changes (derived view)
    } catch (error) {
      push({ tone: "error", title: "Failed", message: "Could not apply bulk changes." });
    }
  }

  const managerOptions = useMemo(() => {
    // Managers: anyone with directReportCount > 0 OR those in the "Managers" bucket
    const set = new Map<string, string>();
    for (const p of derived.rawManagers ?? []) {
      set.set(p.id, safeName(p));
    }
    // fallback: also allow selecting any person (optional), uncomment if desired
    // for (const p of people) set.set(p.id, safeName(p));
    return Array.from(set.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [derived.rawManagers, people]);

  const teamOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of people) {
      const t = (p.teamName || p.team || "").trim();
      if (t && t.toLowerCase() !== "team not set") set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b)).map((name) => ({ name }));
  }, [people]);

  function applyView(v: any) {
    const s = v.state || {};
    setActiveFilters(new Set(s.filters || []));
    setSort((s.sort || "issuesFirst") as SortKey);
    setQuery(s.query || "");
    setFixQueue(!!s.fixQueue);
  }

  async function saveView({ name, shared }: { name: string; shared: boolean }) {
    const state = {
      filters: Array.from(activeFilters),
      sort,
      query,
      fixQueue,
    };
    try {
      const res = await fetch("/api/org/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scope: "people", state, shared }),
      });
      const data = await res.json();
      if (data?.ok) {
        setViews((v) => [...v, data.view]);
        push({ tone: "success", title: "View saved", message: `"${name}" has been saved.` });
      } else {
        push({ tone: "error", title: "Failed to save", message: data?.error ?? "Could not save view." });
      }
    } catch (error) {
      push({ tone: "error", title: "Failed to save", message: "Could not save view." });
    }
  }

  async function deleteView(id: string) {
    try {
      const res = await fetch(`/api/org/views/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data?.ok) {
        setViews((v) => v.filter((x) => x.id !== id));
        push({ tone: "success", title: "View deleted", message: "View has been removed." });
      } else {
        push({ tone: "error", title: "Failed to delete", message: data?.error ?? "Could not delete view." });
      }
    } catch (error) {
      push({ tone: "error", title: "Failed to delete", message: "Could not delete view." });
    }
  }

  async function pinView(id: string, pinned: boolean) {
    try {
      const res = await fetch("/api/org/views/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, pinned }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (data?.ok) {
        setViews((prev) => prev.map((v) => (v.id === id ? data.view : v)));
        push({ tone: "success", title: pinned ? "View pinned" : "View unpinned", message: "" });
      }
    } catch (error) {
      console.warn("Failed to pin view:", error);
    }
  }

  async function setDefaultView(id: string, role: "VIEWER" | "EDITOR" | "ADMIN" | null) {
    try {
      const res = await fetch("/api/org/views/default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (data?.ok) {
        setViews((prev) =>
          prev.map((v) => {
            if (v.scope === data.view.scope && v.defaultForRole === role && v.id !== id) {
              return { ...v, defaultForRole: null };
            }
            return v.id === id ? data.view : v;
          })
        );
        push({ tone: "success", title: "Default view updated", message: "" });
      }
    } catch (error) {
      console.warn("Failed to set default view:", error);
    }
  }

  // Issues are derived from people state - no API loading needed (Golden Rule: Problems Are Views, Not States)

  function applyOptimisticPatch(id: string, patch: { managerId?: string | null; managerName?: string | null; teamName?: string | null }) {
    setPeople((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          ...("managerId" in patch ? { managerId: patch.managerId } : null),
          ...("managerName" in patch ? { managerName: patch.managerName } : null),
          ...("teamName" in patch ? { teamName: patch.teamName } : null),
        } as Person;
      });
      // Re-derive signals after patch
      const signals = derivePeopleSignals(updated);
      setOrgSignals(signals);
      return updated;
    });
  }

  function applyOptimisticBulk(ids: string[], patch: { managerId?: string | null; managerName?: string | null; teamName?: string | null }) {
    const idSet = new Set(ids);
    setPeople((prev) => {
      const updated = prev.map((p) => {
        if (!idSet.has(p.id)) return p;
        return {
          ...p,
          ...("managerId" in patch ? { managerId: patch.managerId } : null),
          ...("managerName" in patch ? { managerName: patch.managerName } : null),
          ...("teamName" in patch ? { teamName: patch.teamName } : null),
        } as Person;
      });
      // Re-derive signals after bulk patch
      const signals = derivePeopleSignals(updated);
      setOrgSignals(signals);
      return updated;
    });
  }

  return (
    <div className="px-6 py-6">
      <PersonProfileDrawer
        open={drawerOpen}
        person={selected}
        managers={managerOptions}
        teams={teamOptions}
        canEdit={canEdit}
        initialFocus={drawerFocus}
        suggestions={selectedSuggestions}
        signals={orgSignals}
        totalPeople={people.length}
        orgId={orgId || undefined}
        onClose={() => setDrawerOpen(false)}
        onPersistPatch={async ({ id, patch }) => {
          if (!canEdit) {
            push({ tone: "info", title: "Read-only", message: "You don't have permission to edit." });
            return;
          }
          
          // Capture before state
          const personBefore = people.find((p) => p.id === id);
          if (!personBefore) return;
          const beforeState = captureBeforeState(personBefore);

          // optimistic first
          applyOptimisticPatch(id, patch);

          const res = await fetch("/api/org/people/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, patch }),
          });

          if (!res.ok) {
            // rollback by refetching (simple + safe)
            const errorData = await res.json().catch(() => ({}));
            const r2 = await fetch("/api/org/people", { cache: "no-store" });
            const data = await r2.json();
            setPeople(Array.isArray(data) ? data : data?.people ?? []);
            setFatalError({ title: "Update failed", message: errorData?.error ?? "Unable to save changes." });
            push({ tone: "error", title: "Couldn't save", message: "We rolled back to server state." });
            throw new Error("Update failed");
          } else {
            // Capture after state
            const personAfter = { ...personBefore, ...patch };
            const afterState = captureAfterState(personAfter);
            
            // Compute impact score
            const impact = computeImpactForPerson({
              person: personAfter,
              signals: orgSignals,
              directReportCount: personAfter.directReportCount || 0,
            });

            // Log fix event (non-blocking)
            if (orgId) {
              const fixEvent = buildFixEvent({
                orgId,
                personId: id,
                fixType: determineFixType(beforeState, afterState),
                beforeState,
                afterState,
                impactScore: impact.score,
              });

              fetch("/api/org/fix-events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(fixEvent),
              }).catch((error) => {
                console.warn("Failed to log fix event:", error);
                // Non-blocking - don't show error to user
              });
            }

            push({ tone: "success", title: "Saved", message: "Profile updated." });
            // Write audit entry
            if (selected) {
              addAudit({
                action: patch.managerId !== undefined ? "update_manager" : "update_team",
                targetCount: 1,
                summary: patch.managerId !== undefined ? `Updated manager for ${safeName(selected)}` : `Updated team for ${safeName(selected)}`,
              });
            }
            // Reload issues after successful update
                  // Issues will update automatically when people state changes (derived view)
            // Auto-advance fix queue
            if (fixQueue) {
              // Find next incomplete person (excluding the one we just saved)
              // Account for optimistic update: if we set managerId, person is no longer incomplete
              const updatedPerson = people.find((p) => p.id === id);
              const isNowComplete = patch.managerId !== null && patch.managerId !== undefined;
              const incomplete = people.filter((p) => {
                if (p.id === id) return false; // Skip the one we just updated
                // If we just set a manager, this person is now complete, so skip
                if (isNowComplete) return !p.managerId;
                // Otherwise, find any incomplete person
                return !p.managerId;
              });
              if (incomplete.length > 0) {
                setSelected(incomplete[0]);
                setDrawerFocus("quickFix");
              } else {
                setDrawerOpen(false);
                setFixQueue(false);
              }
            }
          }
        }}
      />

      <SavedViewsModal
        open={savedViewsOpen}
        activeFilters={activeFilters}
        onApply={(filters) => {
          setActiveFilters(filters);
          setSavedViewsOpen(false);
        }}
        onClose={() => setSavedViewsOpen(false)}
      />

      <BulkActionsModal
        open={bulkOpen}
        people={filteredSet}
        managers={managerOptions}
        teams={teamOptions}
        canEdit={canEdit}
        onApplyBulk={async ({ ids, patch }) => {
          if (!canEdit) {
            push({ tone: "info", title: "Read-only", message: "You don't have permission to edit." });
            return;
          }
          try {
            applyOptimisticBulk(ids, patch);

            const res = await fetch("/api/org/people/bulk", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids, patch }),
            });

            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              const r2 = await fetch("/api/org/people", { cache: "no-store" });
              const data = await r2.json();
              setPeople(Array.isArray(data) ? data : data?.people ?? []);
              setFatalError({ title: "Bulk update failed", message: errorData?.error ?? "Unable to apply bulk changes." });
              push({ tone: "error", title: "Bulk apply failed", message: "Rolled back to server state." });
              throw new Error("Bulk update failed");
            }
            push({ tone: "success", title: "Bulk applied", message: `Updated ${ids.length} people.` });
            // Write audit entry
            addAudit({
              action: patch.managerId !== undefined ? "bulk_update_manager" : "bulk_update_team",
              targetCount: ids.length,
              summary: patch.managerId !== undefined ? `Bulk updated manager (${ids.length})` : `Bulk updated team (${ids.length})`,
            });
            // Reload issues after successful bulk update
                  // Issues will update automatically when people state changes (derived view)
          } catch {
            // swallow: toast+notice already shown
          }
        }}
        onClose={() => setBulkOpen(false)}
      />

      {/* Header row */}
      <div className="mb-4">
        <div className="text-xl font-semibold tracking-[-0.02em] text-black dark:text-white">
          People
        </div>
        {/* Tab navigation */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setTab("people")}
            className={
              tab === "people"
                ? "rounded-full bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
                : "rounded-full border border-black/10 px-4 py-2 text-sm text-black/70 dark:border-white/10 dark:text-white/70"
            }
          >
            People
          </button>
          <button
            onClick={() => setTab("issues")}
            className={
              tab === "issues"
                ? "rounded-full bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
                : "rounded-full border border-black/10 px-4 py-2 text-sm text-black/70 dark:border-white/10 dark:text-white/70"
            }
          >
            Issues
          </button>
        </div>
        <div className="mt-1 text-sm text-black/60 dark:text-white/60">
          Organizational decision surfaces — calm hierarchy, clear intent.
        </div>
      </div>

      {/* Compact Org Health Strip */}
      {hasPeople ? (
        <OrgHealthStrip
          canEdit={canEdit}
          people={people}
          signals={orgSignals}
        />
      ) : null}

      {/* Aging issues insight */}
      {/* Aging issues insight removed - issues are derived from people state, not stored separately (Golden Rule: Problems Are Views, Not States) */}

      {/* Org Switcher */}
      {hasPeople ? (
      <div className="mb-4">
        <OrgSwitcher />
      </div>
      ) : null}

      {/* Guided banner */}
      {hasPeople && issueTypeFromUrl ? (
        <div className="mb-3 rounded-xl border border-black/10 bg-black/5 px-3 py-2 text-xs text-black/60 dark:border-white/10 dark:bg-white/10 dark:text-white/60">
          Guided from Org health
        </div>
      ) : null}

      {/* Saved view banner */}
      {hasPeople && savedView ? (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-black/10 bg-black/5 px-3 py-2 text-xs text-black/60 dark:border-white/10 dark:bg-white/10 dark:text-white/60">
          <span>
            Viewing saved view: <strong>{savedView.title}</strong>
            {isDefaultView ? (
              <span className="ml-2 rounded-full border border-black/10 bg-white/60 px-2 py-0.5 text-xs text-black/50 dark:border-white/10 dark:bg-white/10 dark:text-white/50">
                Default view for your role
              </span>
            ) : null}
          </span>
          <button
            onClick={() => {
              const next = new URLSearchParams(sp.toString());
              next.delete("view");
              router.push(`?${next.toString()}`);
            }}
            className="ml-3 rounded-lg border border-black/10 bg-white px-2 py-1 text-xs hover:bg-black/5 dark:border-white/10 dark:bg-black dark:hover:bg-white/10"
          >
            Exit view
          </button>
        </div>
      ) : null}

      {/* Error notice */}
      {fatalError ? (
        <ErrorNotice
          title={fatalError.title}
          message={fatalError.message}
          onDismiss={() => setFatalError(null)}
        />
      ) : null}

      {/* Command Bar */}
      {(hasPeople || isZeroResults) ? (
      <PeopleCommandBar
        mode={tab as "people" | "issues"}
          focusMode={focusMode}
          setFocusMode={setFocusMode}
        query={query}
        setQuery={setQuery}
        sort={sort}
        setSort={(v) => setSort(v as SortKey)}
        canEdit={canEdit}
          onPrimaryAction={handlePrimaryAction}
      >
        <div className="flex flex-col gap-2">
          <FiltersChips
            active={activeFilters}
            counts={derived.counts}
            onToggle={toggleFilter}
            onClear={clearFilters}
          />
          <SavedViewsBar
            views={views}
            onApply={applyView}
            onSave={saveView}
            onDelete={deleteView}
            onPin={pinView}
            onSetDefault={setDefaultView}
            canAdmin={canEdit && role === "ADMIN"}
          />
        </div>
      </PeopleCommandBar>
      ) : null}

      {/* STATE 1: EMPTY ORG */}
      {isEmptyOrg ? (
        <>
          {/* Optional helper line */}
          <div className="mb-6 text-sm text-black/50 dark:text-white/50">
            Nothing here yet — start by adding people.
          </div>
          <EmptyState
            title="Start modeling your organization"
            description="Add your first person and place them in your org structure. You can complete missing details later."
            ctaLabel="Add person"
            onCta={() => setAddPersonOpen(true)}
          />
        </>
      ) : loading ? (
        <div className="rounded-2xl border border-black/5 bg-white/70 p-6 text-sm text-black/60 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/60">
          Loading people…
        </div>
      ) : (
        <>
      {/* Render Issues tab or People tab */}
      {tab === "issues" ? (
        <>
        <PeopleIssuesTab
          canEdit={canEdit}
                                focusMode={focusMode}
                                people={people}
                                signals={orgSignals}
          onOpenPerson={openFromIssues}
          onBulkAssignManager={bulkAssignManager}
          computeSuggestionsForPerson={computeSuggestionsForPerson}
                                // Issues are derived from people state - no manual sync needed
          issueTypeFromUrl={issueTypeFromUrl}
          savedView={savedView}
        />
          <div className="mt-6">
            <OrgHealthHistory />
          </div>
        </>
      ) : (
        <>
              {/* STATE 2: ZERO RESULTS */}
              {isZeroResults ? (
                <div className="mt-6 text-center text-sm text-black/60 dark:text-white/60">
                  No people match your current filters.
                  <button
                    onClick={resetFilters}
                    className="ml-1 underline underline-offset-2 hover:text-black dark:hover:text-white"
                  >
                    Reset filters
                  </button>
                </div>
              ) : null}

              {/* STATE 3: POPULATED ORG */}
              {isPopulated ? (
                <>
      <div className="mb-4 flex items-center justify-between">
        <FixQueueToggle
          enabled={fixQueue}
          count={derived.rawMissingReporting.length}
          onToggle={() => setFixQueue((v) => !v)}
        />

        {fixQueue ? (
          <div className="text-xs text-black/50 dark:text-white/50">
            Fix queue mode: focus on unresolved structural gaps.
          </div>
        ) : null}
      </div>

      {/* Global issues banner (only if issues exist) */}
      {derived.countMissingReporting > 0 ? (
        <IssuesBanner
          countMissingReporting={derived.countMissingReporting}
          onClickReview={() => {
            const el = document.getElementById("incomplete-section");
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      ) : null}

                  <div className="space-y-6">
            {/* Managers first (structural anchors) */}
                    {derived.managers.length > 0 ? (
            <section>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <div className="text-sm font-semibold text-black/90 dark:text-white/90">
                    Managers
                  </div>
                  <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                    Structural anchors — optimized for navigating reporting.
                  </div>
                </div>
                <div className="text-xs text-black/40 dark:text-white/40">
                  {derived.managers.length}
                </div>
              </div>
                        <PeopleGrid
                          people={derived.managers}
                          mode={focusMode}
                          selectedIds={focusMode === "fix" ? selectedIds : undefined}
                          onToggleSelect={focusMode === "fix" ? handleToggleSelect : undefined}
                          onOpen={handleOpen}
                          onQuickFix={handleQuickFix}
                          signals={orgSignals}
                        />
            </section>
                    ) : null}

            {/* ICs (quiet, operational nodes) */}
                    {derived.ics.length > 0 ? (
            <section>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <div className="text-sm font-semibold text-black/90 dark:text-white/90">
                    Individuals
                  </div>
                  <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                    Operational nodes — optimized for profile drill-down.
                  </div>
                </div>
                <div className="text-xs text-black/40 dark:text-white/40">
                  {derived.ics.length}
                </div>
              </div>
                        <PeopleGrid
                          people={derived.ics}
                          mode={focusMode}
                          selectedIds={focusMode === "fix" ? selectedIds : undefined}
                          onToggleSelect={focusMode === "fix" ? handleToggleSelect : undefined}
                          onOpen={handleOpen}
                          onQuickFix={handleQuickFix}
                          signals={orgSignals}
                        />
            </section>
                    ) : null}

            {/* Incomplete (attention magnets) */}
            {derived.missingReporting.length > 0 ? (
              <section id="incomplete-section">
                <div className="mb-3 flex items-end justify-between">
                  <div>
                    <div className="text-sm font-semibold text-black/90 dark:text-white/90">
                      Needs attention
                    </div>
                    <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                      Incomplete records — optimized for fast correction.
                    </div>
                  </div>
                  <div className="text-xs text-black/40 dark:text-white/40">
                    {derived.missingReporting.length}
                  </div>
                </div>
                        <PeopleGrid
                          people={derived.missingReporting}
                          mode={focusMode}
                          selectedIds={focusMode === "fix" ? selectedIds : undefined}
                          onToggleSelect={focusMode === "fix" ? handleToggleSelect : undefined}
                          onOpen={handleOpen}
                          onQuickFix={handleQuickFix}
                          signals={orgSignals}
                        />
              </section>
            ) : null}
              </div>
                </>
          ) : null}
            </>
          )}
        </>
      )}

      {/* Utilities Drawer */}
      {hasPeople ? (() => {
        // Compute capacity data
        const availabilityByPersonId: Record<string, { status: "available" | "partial" | "unavailable"; fraction?: number }> = {};
        const allocationsByPersonId: Record<string, { fraction: number; startDate: Date; endDate?: Date }[]> = {};
        let sumEffective = 0;
        let orgOverallocatedCount = 0;

        for (const p of people) {
          // Derive availability
          const availabilityWindows = p.availability?.map((a: any) => ({
            type: a.type === "UNAVAILABLE" ? "unavailable" : "partial",
            startDate: new Date(a.startDate),
            endDate: a.endDate ? new Date(a.endDate) : undefined,
            fraction: a.fraction,
          })) || [];
          const availability = deriveCurrentAvailability(availabilityWindows);
          availabilityByPersonId[p.id] = availability;

          // Get allocations
          const allocations = p.allocations?.map((a: any) => ({
            fraction: a.fraction,
            startDate: new Date(a.startDate),
            endDate: a.endDate ? new Date(a.endDate) : undefined,
          })) || [];
          allocationsByPersonId[p.id] = allocations;

          // Compute effective capacity
          const eff = deriveEffectiveCapacity({
            availabilityStatus: availability.status,
            partialFraction: availability.fraction,
            allocations,
          });
          sumEffective += eff.effectiveFraction;

          // Check if overallocated
          const base = availability.status === "unavailable" ? 0 : availability.status === "partial" ? (availability.fraction ?? 0.5) : 1;
          const allocated = allocations.reduce((s, a) => s + (a.fraction || 0), 0);
          if (allocated > base + 1e-6) orgOverallocatedCount += 1;
        }

        const orgAvgCapacityPct = people.length === 0 ? 0 : Math.round((sumEffective / people.length) * 100);
        const teamRows = deriveTeamCapacity({
          people,
          availabilityByPersonId,
          allocationsByPersonId,
        });

        return (
          <UtilitiesDrawer
            orgSnapshot={
              <OrgSnapshotPanel
                open={true}
                onToggle={() => {}}
                counts={{
                  total: derived.total,
                  showing: filteredSet.length,
                  managers: derived.managers.length,
                  individuals: derived.ics.length,
                  incomplete: derived.missingReporting.length,
                }}
              />
            }
            recentChanges={
              orgId ? (
                <RecentChanges orgId={orgId} limit={8} />
              ) : (
                <RecentChangesPanel
                  open={true}
                  onToggle={() => {}}
                  entries={audit}
                  onClear={clearAudit}
                />
              )
            }
            capacityView={
              <>
                <CapacityStrip avgCapacityPct={orgAvgCapacityPct} overallocatedCount={orgOverallocatedCount} />
                <div className="mt-4">
                  <TeamCapacityTable rows={teamRows} />
                </div>
              </>
            }
          />
        );
      })() : null}

      {/* Bulk Action Bar */}
      {focusMode === "fix" && selectedIds.size > 0 ? (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onResolve={resolveSelectedIssues}
          onClear={handleClearSelection}
        />
      ) : null}

      {/* Place Person Drawer */}
      <PlacePersonDrawer
        open={addPersonOpen}
        onClose={() => setAddPersonOpen(false)}
        onCreate={handleCreatePerson}
        peopleOptions={people.map((p) => ({
          id: p.id,
          name: safeName(p),
        }))}
        teamOptions={teamOptions.map((t) => ({
          id: t.name,
          name: t.name,
        }))}
      />

      {/* Edit Person Drawer */}
      <EditPersonDrawer
        open={editPersonOpen}
        person={selected}
        peopleOptions={people.map((p) => ({
          id: p.id,
          name: safeName(p),
        }))}
        teamOptions={teamOptions.map((t) => ({
          id: t.name,
          name: t.name,
        }))}
        onClose={() => {
          setEditPersonOpen(false);
          setSelected(null);
        }}
        onSave={handleSavePerson}
        onAddAvailability={async (personId, window) => {
          if (!canEdit) {
            push({ tone: "info", title: "Read-only", message: "You don't have permission to edit." });
            return;
          }

          try {
            const res = await fetch(`/api/org/people/${personId}/availability`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(window),
            });

            if (!res.ok) {
              const error = await res.json();
              throw new Error(error.error || "Failed to add availability");
            }

            // Reload people to get updated availability
            const reloadRes = await fetch("/api/org/people", { cache: "no-store" });
            const reloadData = await reloadRes.json();
            if (reloadRes.ok && reloadData?.ok && Array.isArray(reloadData.people)) {
              setPeople(reloadData.people);
            } else if (reloadRes.ok && Array.isArray(reloadData)) {
              setPeople(reloadData);
            }
            push({ tone: "success", title: "Availability added", message: "Time off has been recorded." });
          } catch (error: any) {
            console.error("Failed to add availability:", error);
            push({ tone: "error", title: "Failed", message: error.message || "Failed to add availability." });
          }
        }}
        onAddAllocation={async (personId, allocation) => {
          if (!canEdit) {
            push({ tone: "info", title: "Read-only", message: "You don't have permission to edit." });
            return;
          }

          try {
            const res = await fetch(`/api/org/people/${personId}/allocations`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(allocation),
            });

            if (!res.ok) {
              const error = await res.json();
              throw new Error(error.error || "Failed to add allocation");
            }

            // Reload people to get updated allocations
            const reloadRes = await fetch("/api/org/people", { cache: "no-store" });
            const reloadData = await reloadRes.json();
            if (reloadRes.ok && reloadData?.ok && Array.isArray(reloadData.people)) {
              setPeople(reloadData.people);
            } else if (reloadRes.ok && Array.isArray(reloadData)) {
              setPeople(reloadData);
            }
            push({ tone: "success", title: "Allocation added", message: "Time commitment has been recorded." });
          } catch (error: any) {
            console.error("Failed to add allocation:", error);
            push({ tone: "error", title: "Failed", message: error.message || "Failed to add allocation." });
          }
        }}
        projectOptions={projects}
      />

      {/* Assign Manager Drawer */}
      {assignPerson && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div
            className="absolute inset-0 bg-black/30 pointer-events-auto"
            onClick={() => {
              setAssignManagerOpen(false);
              setAssignPerson(null);
            }}
          />
          <aside className="pointer-events-auto absolute right-0 top-0 h-full w-full max-w-md border-l border-black/10 bg-white/80 p-6 backdrop-blur dark:border-white/10 dark:bg-black/80">
            <header className="mb-6 flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-black/90 dark:text-white/90">
                  Assign manager
                </div>
                <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                  {safeName(assignPerson)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAssignManagerOpen(false);
                  setAssignPerson(null);
                }}
                className="rounded-lg px-2 py-1 text-xs text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
              >
                Close
              </button>
            </header>
            <AssignManager
              person={assignPerson}
              peopleOptions={people.map((p) => ({
                id: p.id,
                name: safeName(p),
              }))}
              onSave={async (managerId, managerName) => {
                await handleAssignManager(assignPerson.id, managerId, managerName);
              }}
              onCancel={() => {
                setAssignManagerOpen(false);
                setAssignPerson(null);
              }}
            />
          </aside>
        </div>
      )}

      {/* Assign Team Drawer */}
      {assignPerson && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div
            className="absolute inset-0 bg-black/30 pointer-events-auto"
            onClick={() => {
              setAssignTeamOpen(false);
              setAssignPerson(null);
            }}
          />
          <aside className="pointer-events-auto absolute right-0 top-0 h-full w-full max-w-md border-l border-black/10 bg-white/80 p-6 backdrop-blur dark:border-white/10 dark:bg-black/80">
            <header className="mb-6 flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-black/90 dark:text-white/90">
                  Assign team
                </div>
                <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                  {safeName(assignPerson)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAssignTeamOpen(false);
                  setAssignPerson(null);
                }}
                className="rounded-lg px-2 py-1 text-xs text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
              >
                Close
              </button>
            </header>
            <AssignTeam
              person={assignPerson}
              teamOptions={teamOptions.map((t) => ({
                id: t.name,
                name: t.name,
              }))}
              onSave={async (teamId, teamName) => {
                await handleAssignTeam(assignPerson.id, teamId, teamName);
              }}
              onCancel={() => {
                setAssignTeamOpen(false);
                setAssignPerson(null);
              }}
            />
          </aside>
        </div>
      )}
    </div>
  );
}

export default function OrgPeoplePage() {
  return (
    <ToastProvider>
      <OrgPeoplePageInner />
    </ToastProvider>
  );
}

