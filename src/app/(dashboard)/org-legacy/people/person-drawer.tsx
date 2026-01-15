"use client";

import React, { useEffect, useMemo, useState } from "react";

type DrawerData = {
  ok: boolean;
  person: {
    id: string;
    name: string;
    email: string | null;
    title: string | null;
    roleName: string | null;
    teamName: string | null;
    managerId: string | null;
  };
  manager: { id: string; name: string } | null;
  directReports: {
    id: string;
    name: string;
    title: string | null;
    roleName: string | null;
    teamName: string | null;
  }[];
  work: {
    projectId: string;
    projectName: string;
    fraction: number;
    startDate: string | null;
    endDate: string | null;
  }[];
  completeness: {
    missingReportingLine: boolean;
    missingRole: boolean;
    missingTeam: boolean;
  };
  error?: { code: string; message: string };
};

export default function PersonDrawer(props: {
  personId: string;
  orgId: string;
  people: { id: string; name: string }[];
  onClose: () => void;
  onUpdated: () => Promise<void>;
  onRecordChange: (c: {
    at: string;
    kind: "person_update";
    personId: string;
    personName: string;
    fields: string[];
  }) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DrawerData | null>(null);
  const [tab, setTab] = useState<"profile" | "structure" | "work">("profile");
  
  // Edit mode state
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Draft fields
  const [draft, setDraft] = useState({
    email: "",
    title: "",
    roleName: "",
    teamName: "",
    managerId: "",
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/org/people/${encodeURIComponent(props.personId)}`);
        const json = (await res.json().catch(() => null)) as DrawerData | null;
        if (!alive) return;
        setData(json);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [props.personId]);
  
  // Set draft when data loads
  useEffect(() => {
    if (!data?.ok) return;
    setDraft({
      email: data.person.email ?? "",
      title: data.person.title ?? "",
      roleName: data.person.roleName ?? "",
      teamName: data.person.teamName ?? "",
      managerId: data.person.managerId ?? "",
    });
  }, [data?.ok, data?.person?.id]);

  const titleLine = useMemo(() => {
    const p = data?.person;
    if (!p) return "";
    const bits = [p.title || p.roleName || "Role not set", p.teamName || null].filter(Boolean);
    return bits.join(" · ");
  }, [data]);

  const impact = useMemo(() => {
    const c = data?.completeness;
    if (!c) return { status: "Unknown", items: [] as string[] };
    const missing = [
      c.missingReportingLine && "Reporting line missing",
      c.missingRole && "Role not set",
      c.missingTeam && "Team not set",
    ].filter(Boolean) as string[];
    if (missing.length === 0) return { status: "Complete", items: ["No structural gaps detected."] };
    return { status: "Incomplete", items: missing };
  }, [data]);
  
  async function save() {
    if (!data?.ok) return;

    const patch: any = {};
    if ((draft.email || "") !== (data.person.email ?? "")) patch.email = draft.email.trim() || null;
    if ((draft.title || "") !== (data.person.title ?? "")) patch.title = draft.title.trim() || null;
    if ((draft.roleName || "") !== (data.person.roleName ?? "")) patch.roleName = draft.roleName.trim() || null;
    if ((draft.teamName || "") !== (data.person.teamName ?? "")) patch.teamName = draft.teamName.trim() || null;

    // manager: allow clear
    const currentMgr = data.person.managerId ?? "";
    const nextMgr = draft.managerId || "";
    if (nextMgr !== currentMgr) patch.managerId = nextMgr ? nextMgr : null;

    const fields = Object.keys(patch);
    if (fields.length === 0) {
      setEdit(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/org/people/${encodeURIComponent(props.personId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patch }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        alert(json?.error?.message || "Failed to save changes");
        return;
      }

      props.onRecordChange({
        at: new Date().toISOString(),
        kind: "person_update",
        personId: props.personId,
        personName: data.person.name,
        fields,
      });

      // Refresh drawer data
      const reload = await fetch(`/api/org/people/${encodeURIComponent(props.personId)}`);
      const rejson = await reload.json().catch(() => null);
      setData(rejson);

      await props.onUpdated();
      setEdit(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={props.onClose}>
      <div
        className="h-full w-full max-w-xl overflow-y-auto border-l border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">
              {data?.person?.name || (loading ? "Loading…" : "Person")}
            </div>
            <div className="mt-1 truncate text-sm text-black/50 dark:text-white/50">
              {loading ? "Fetching details…" : titleLine || "—"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!loading && data?.ok && !edit && (
              <button
                onClick={() => setEdit(true)}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
              >
                Edit
              </button>
            )}
            {edit && (
              <>
                <button
                  onClick={() => {
                    setEdit(false);
                    // Reset draft to current data
                    if (data?.ok) {
                      setDraft({
                        email: data.person.email ?? "",
                        title: data.person.title ?? "",
                        roleName: data.person.roleName ?? "",
                        teamName: data.person.teamName ?? "",
                        managerId: data.person.managerId ?? "",
                      });
                    }
                  }}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="rounded-xl bg-black px-3 py-2 text-sm text-white disabled:opacity-50 hover:opacity-90 dark:bg-white dark:text-black"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </>
            )}
            <button
              onClick={props.onClose}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
            >
              Close
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5">
          <div className="inline-flex rounded-xl border border-black/10 bg-white/80 p-1 dark:border-white/10 dark:bg-white/10">
            <Tab label="Profile" active={tab === "profile"} onClick={() => setTab("profile")} />
            <Tab label="Structure" active={tab === "structure"} onClick={() => setTab("structure")} />
            <Tab label="Work" active={tab === "work"} onClick={() => setTab("work")} />
          </div>
        </div>

        {/* Org impact strip */}
        <div className="mx-5 mt-4 rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Org impact</div>
            <div className="text-xs text-black/50 dark:text-white/50">{impact.status}</div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {impact.items.map((x, i) => (
              <span
                key={i}
                className="rounded-full border border-black/10 bg-white/70 px-2 py-1 text-[11px] text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60"
              >
                {x}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-40 rounded bg-black/10 dark:bg-white/10" />
              <div className="h-20 rounded-2xl bg-black/10 dark:bg-white/10" />
              <div className="h-20 rounded-2xl bg-black/10 dark:bg-white/10" />
            </div>
          ) : data?.ok ? (
            <>
              {tab === "profile" ? (
                <ProfilePanel
                  data={data}
                  edit={edit}
                  draft={draft}
                  setDraft={setDraft}
                  personId={props.personId}
                  onOpenPerson={(id) => {
                    // Update URL with personId param for deep-linking
                    if (typeof window !== "undefined") {
                      const url = new URL(window.location.href);
                      url.searchParams.set("personId", id);
                      // Use replaceState to avoid adding to history, then reload to trigger useEffect
                      window.history.replaceState({}, "", url.toString());
                      // Close current drawer
                      props.onClose();
                      // Small delay then reload to open new drawer
                      setTimeout(() => {
                        window.location.reload();
                      }, 100);
                    }
                  }}
                />
              ) : null}
              {tab === "structure" ? (
                <StructurePanel data={data} edit={edit} draft={draft} setDraft={setDraft} people={props.people} personId={props.personId} />
              ) : null}
              {tab === "work" ? <WorkPanel data={data} /> : null}
            </>
          ) : (
            <div className="text-sm text-red-500">{data?.error?.message || "Failed to load person"}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Tab(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={props.onClick}
      className={`rounded-lg px-3 py-2 text-sm ${
        props.active ? "bg-black text-white dark:bg-white dark:text-black" : "text-black/70 dark:text-white/70"
      }`}
    >
      {props.label}
    </button>
  );
}

function Row(props: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
      <div className="text-black/60 dark:text-white/60">{props.k}</div>
      <div className="text-black/80 dark:text-white/80">{props.v}</div>
    </div>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-black/50 dark:text-white/50">{props.title}</div>
      {props.children}
    </div>
  );
}

type OrgReadinessResponse = {
  meta: { asOf: string; lookaheadDays: number; personId?: string | null };
  verdict: {
    action: "proceed" | "reassign" | "delay" | "request_support";
    confidence: "low" | "medium";
    rationale: string;
  };
  signals: {
    ownership: "ok" | "warn" | "risk";
    managementLoad: "ok" | "warn" | "risk";
    capacity: "ok" | "warn" | "risk";
    impact: "ok" | "warn" | "risk" | "na";
  };
  summary: {
    unownedDepartments: number;
    unownedTeams: number;
    unownedPositions: number;
    overloadedManagers: number;
    orphans: number;
    availableNow: number;
    effectiveCapacityUnits: number;
    impactedPeople?: number | null;
  };
  evidence: Array<{
    key: string;
    label: string;
    severity: "info" | "warn" | "risk";
    detail?: string | null;
  }>;
};

function OrgReadinessSection({ personId }: { personId: string }) {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<OrgReadinessResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/org/readiness?personId=${encodeURIComponent(personId)}&lookaheadDays=14`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as OrgReadinessResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("Readiness unavailable.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [personId]);

  const actionLabel =
    data?.verdict.action === "proceed"
      ? "Proceed"
      : data?.verdict.action === "reassign"
        ? "Reassign"
        : data?.verdict.action === "delay"
          ? "Delay"
          : data?.verdict.action === "request_support"
            ? "Request support"
            : "—";

  const actionClass =
    data?.verdict.action === "proceed"
      ? "border-emerald-300/40 bg-emerald-50/60 text-emerald-900 dark:border-emerald-300/30 dark:bg-emerald-900/15 dark:text-emerald-100"
      : data?.verdict.action === "reassign"
        ? "border-amber-300/40 bg-amber-50/60 text-amber-900 dark:border-amber-300/30 dark:bg-amber-900/10 dark:text-amber-100"
        : data?.verdict.action === "delay"
          ? "border-rose-300/40 bg-rose-50/60 text-rose-900 dark:border-rose-300/30 dark:bg-rose-900/10 dark:text-rose-100"
          : "border-slate-300/40 bg-slate-50/60 text-slate-900 dark:border-slate-300/20 dark:bg-white/5 dark:text-white/80";

  function signalPill(label: string, value: "ok" | "warn" | "risk" | "na") {
    const cls =
      value === "ok"
        ? "border-emerald-300/30 bg-emerald-50/60 text-emerald-900 dark:border-emerald-300/20 dark:bg-emerald-900/10 dark:text-emerald-100"
        : value === "warn"
          ? "border-amber-300/30 bg-amber-50/60 text-amber-900 dark:border-amber-300/20 dark:bg-amber-900/10 dark:text-amber-100"
          : value === "risk"
            ? "border-rose-300/30 bg-rose-50/60 text-rose-900 dark:border-rose-300/20 dark:bg-rose-900/10 dark:text-rose-100"
            : "border-black/10 bg-white/70 text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60";

    const text = value === "na" ? "N/A" : value.toUpperCase();

    return (
      <span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${cls}`}>
        {label}: {text}
      </span>
    );
  }

  function severityDot(sev: "info" | "warn" | "risk") {
    const cls =
      sev === "info"
        ? "bg-slate-400/80"
        : sev === "warn"
          ? "bg-amber-400/90"
          : "bg-rose-400/90";
    return <span className={`mt-[5px] inline-block h-2 w-2 shrink-0 rounded-full ${cls}`} />;
  }

  function onEvidenceClick(key: string) {
    if (typeof window === "undefined") return;

    if (key.startsWith("unowned_")) {
      window.location.href = "/org/people?mode=fix&focus=ownership";
      return;
    }
    if (key === "orphans" || key === "overloaded_managers") {
      window.location.href = "/org/people?mode=fix&focus=management";
      return;
    }
    if (key === "capacity") {
      window.location.href = "/org/people?mode=explore&availability=available";
      return;
    }
    if (key === "impact") {
      const el = document.querySelector('[data-section="impact-radius"]');
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
  }

  return (
    <Section title="Org readiness">
      <div className="text-xs text-black/40 dark:text-white/40 mb-2">
        Org-only signals to frame proceed / reassign / delay / request support.
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-8 w-40 animate-pulse rounded-xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5" />
          <div className="h-4 w-72 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-6 w-24 animate-pulse rounded-full border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5"
              />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-xs text-black/50 dark:border-white/10 dark:bg-white/5 dark:text-white/50">
          {error}
        </div>
      ) : data ? (
        <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${actionClass}`}>
                {actionLabel}
              </div>
              <div className="mt-2 text-sm text-black/80 dark:text-white/80">
                {data.verdict.rationale}
                <span className="ml-2 text-xs text-black/40 dark:text-white/40">
                  ({data.verdict.confidence} confidence)
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {signalPill("Ownership", data.signals.ownership)}
            {signalPill("Mgmt", data.signals.managementLoad)}
            {signalPill("Capacity", data.signals.capacity)}
            {signalPill("Impact", data.signals.impact)}
          </div>

          {data.evidence.length > 0 ? (
            <div className="mt-4">
              <div className="text-xs font-medium text-black/50 dark:text-white/50 mb-2">
                Evidence
              </div>
              <div className="space-y-1">
                {data.evidence.slice(0, 5).map((e) => (
                  <button
                    key={e.key}
                    onClick={() => onEvidenceClick(e.key)}
                    className="w-full text-left rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-xs hover:bg-white/90 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    <div className="flex items-start gap-2">
                      {severityDot(e.severity)}
                      <div className="flex-1">
                        <div className="text-black/80 dark:text-white/80">{e.label}</div>
                        {e.detail ? (
                          <div className="mt-0.5 text-[10px] text-black/50 dark:text-white/50">
                            {e.detail}
                          </div>
                        ) : null}
                      </div>
                      <div className="text-[10px] text-black/40 dark:text-white/40">→</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Section>
  );
}

type CoverageResponse = {
  person: { id: string; name: string; title: string | null };
  candidates: Array<{
    id: string;
    name: string;
    title: string | null;
    teamName: string | null;
    departmentName: string | null;
    score: number;
    reasons: string[];
  }>;
  heuristic: {
    version: string;
    weights: { sameTeam: number; sameDepartment: number; similarRoleMax: number };
    minimumScore: number;
  };
};

function CoverageSection({ personId, onOpenPerson }: { personId: string; onOpenPerson?: (id: string) => void }) {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<CoverageResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/org/people/${encodeURIComponent(personId)}/coverage`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as CoverageResponse;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError("Couldn't load coverage candidates.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [personId]);

  return (
    <Section title="Coverage">
      <div className="text-xs text-black/40 dark:text-white/40 mb-2">
        If this person is unavailable, suggested backups (explainable).
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-xs text-red-500 dark:border-white/10 dark:bg-white/5">
          {error}
        </div>
      ) : data && data.candidates.length > 0 ? (
        <div className="space-y-2">
          {data.candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium">{candidate.name}</div>
                  <div className="mt-0.5 text-xs text-black/60 dark:text-white/60">
                    {candidate.title || "No title"}
                    {candidate.teamName ? ` · ${candidate.teamName}` : ""}
                    {candidate.departmentName && !candidate.teamName ? ` · ${candidate.departmentName}` : ""}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {candidate.reasons.map((reason, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-black/10 bg-white/70 px-2 py-0.5 text-[10px] text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
                {onOpenPerson && (
                  <button
                    onClick={() => onOpenPerson(candidate.id)}
                    className="ml-3 rounded-lg border border-black/10 bg-white px-2 py-1 text-xs hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                  >
                    Open
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-xs text-black/50 dark:border-white/10 dark:bg-white/5 dark:text-white/50">
          No good candidates found yet — assign team/department/role to improve coverage.
        </div>
      )}
    </Section>
  );
}

type DecisionPathResponse = {
  person: { id: string; name: string; title: string | null; departmentName: string | null; teamName: string | null };
  chain: Array<{
    id: string;
    name: string;
    title: string | null;
    departmentName: string | null;
    teamName: string | null;
  }>;
  meta: {
    maxDepth: number;
    cycleDetected: boolean;
    missingLink: boolean;
  };
};

function DecisionPathSection({ personId, onOpenPerson }: { personId: string; onOpenPerson?: (id: string) => void }) {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<DecisionPathResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/org/people/${encodeURIComponent(personId)}/decision-path`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as DecisionPathResponse;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError("Couldn't load decision path.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [personId]);

  return (
    <Section title="Escalation & decision path">
      <div className="text-xs text-black/40 dark:text-white/40 mb-2">
        Manager chain used to determine decision authority and escalation.
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-xs text-red-500 dark:border-white/10 dark:bg-white/5">
          {error}
        </div>
      ) : data ? (
        <>
          {/* Warnings */}
          {data.meta.missingLink && (
            <div className="mb-2 rounded-xl border border-amber-400/40 bg-amber-50/50 px-3 py-2 text-xs text-amber-900 dark:border-amber-300/30 dark:bg-amber-900/10 dark:text-amber-100">
              Reporting line incomplete — decision authority may be unclear.
            </div>
          )}
          {data.meta.cycleDetected && (
            <div className="mb-2 rounded-xl border border-red-400/40 bg-red-50/50 px-3 py-2 text-xs text-red-900 dark:border-red-300/30 dark:bg-red-900/10 dark:text-red-100">
              Cycle detected in reporting lines — please fix.
            </div>
          )}

          {/* Person (you are here) */}
          <div className="mb-2 rounded-xl border border-blue-400/40 bg-blue-50/50 px-3 py-2 text-sm dark:border-blue-300/30 dark:bg-blue-900/10">
            <div className="font-medium text-blue-900 dark:text-blue-100">{data.person.name}</div>
            <div className="mt-0.5 text-xs text-blue-700 dark:text-blue-300">
              {data.person.title || "No title"}
              {data.person.teamName ? ` · ${data.person.teamName}` : ""}
              {data.person.departmentName && !data.person.teamName ? ` · ${data.person.departmentName}` : ""}
            </div>
            <div className="mt-1 text-[10px] font-medium text-blue-600 dark:text-blue-400">You are here</div>
          </div>

          {/* Chain (direct manager first, top last) */}
          {data.chain.length > 0 ? (
            <div className="space-y-2">
              {data.chain.map((node, idx) => (
                <div
                  key={node.id}
                  className={`flex items-start gap-2 rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 ${
                    onOpenPerson ? "cursor-pointer hover:bg-white/90 dark:hover:bg-white/10" : ""
                  }`}
                  onClick={() => onOpenPerson?.(node.id)}
                >
                  <div className="flex-1">
                    <div className="font-medium">{node.name}</div>
                    <div className="mt-0.5 text-xs text-black/60 dark:text-white/60">
                      {node.title || "No title"}
                      {node.teamName ? ` · ${node.teamName}` : ""}
                      {node.departmentName && !node.teamName ? ` · ${node.departmentName}` : ""}
                    </div>
                    {idx === 0 && (
                      <div className="mt-1 text-[10px] text-black/50 dark:text-white/50">Direct manager</div>
                    )}
                    {idx === data.chain.length - 1 && idx > 0 && (
                      <div className="mt-1 text-[10px] text-black/50 dark:text-white/50">Top-level</div>
                    )}
                  </div>
                  {onOpenPerson && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPerson(node.id);
                      }}
                      className="rounded-lg border border-black/10 bg-white px-2 py-1 text-xs hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                    >
                      Open
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-xs text-black/50 dark:border-white/10 dark:bg-white/5 dark:text-white/50">
              No manager set — this person may be a top-level owner.
            </div>
          )}

          {/* Fix link */}
          {(data.meta.missingLink || data.meta.cycleDetected || data.chain.length === 0) && (
            <div className="mt-2">
              <a
                href="/org/people?mode=fix&focus=management"
                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                Fix reporting line →
              </a>
            </div>
          )}
        </>
      ) : null}
    </Section>
  );
}

type ImpactRadiusResponse = {
  person: { id: string; name: string; title: string | null };
  summary: {
    directReports: number;
    indirectReports: number;
    teamPeers: number;
    departmentPeers: number;
    managersInChain: number;
    totalImpactedPeople: number;
  };
  groups: {
    directReports: Array<{ id: string; name: string; title: string | null }>;
    indirectReports: Array<{ id: string; name: string; title: string | null }>;
    teamPeers: Array<{ id: string; name: string; title: string | null }>;
    departmentPeers: Array<{ id: string; name: string; title: string | null }>;
    managersInChain: Array<{ id: string; name: string; title: string | null }>;
  };
  meta: {
    maxDepth: number;
    maxNodes: number;
    truncated: boolean;
  };
};

function ImpactRadiusSection({ personId, onOpenPerson }: { personId: string; onOpenPerson?: (id: string) => void }) {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<ImpactRadiusResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set(["directReports"]));

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/org/people/${encodeURIComponent(personId)}/impact-radius`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ImpactRadiusResponse;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError("Couldn't load impact radius.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [personId]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  return (
    <div data-section="impact-radius">
      <Section title="Impact radius">
      <div className="text-xs text-black/40 dark:text-white/40 mb-2">
        Who is affected if this owner is delayed or changes direction.
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-6 w-20 animate-pulse rounded-full border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5"
              />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-xs text-red-500 dark:border-white/10 dark:bg-white/5">
          {error}
        </div>
      ) : data ? (
        <>
          {/* Summary chips */}
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-black/10 bg-white/70 px-2 py-1 text-[10px] text-black/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
              Direct reports: {data.summary.directReports}
            </span>
            <span className="rounded-full border border-black/10 bg-white/70 px-2 py-1 text-[10px] text-black/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
              Org subtree: {data.summary.directReports + data.summary.indirectReports}
            </span>
            {data.summary.teamPeers > 0 && (
              <span className="rounded-full border border-black/10 bg-white/70 px-2 py-1 text-[10px] text-black/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                Team peers: {data.summary.teamPeers}
              </span>
            )}
            {data.summary.departmentPeers > 0 && (
              <span className="rounded-full border border-black/10 bg-white/70 px-2 py-1 text-[10px] text-black/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                Dept peers: {data.summary.departmentPeers}
              </span>
            )}
            {data.summary.managersInChain > 0 && (
              <span className="rounded-full border border-black/10 bg-white/70 px-2 py-1 text-[10px] text-black/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                Managers: {data.summary.managersInChain}
              </span>
            )}
            <span className="rounded-full border border-blue-400/40 bg-blue-50/50 px-2 py-1 text-[10px] font-medium text-blue-900 dark:border-blue-300/30 dark:bg-blue-900/10 dark:text-blue-100">
              Total impacted: {data.summary.totalImpactedPeople}
            </span>
          </div>

          {/* Collapsible groups */}
          {data.summary.totalImpactedPeople === 0 ? (
            <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-xs text-black/50 dark:border-white/10 dark:bg-white/5 dark:text-white/50">
              Impact radius is small — no reporting lines or team/department assigned.
            </div>
          ) : (
            <div className="space-y-2">
              {/* Direct reports */}
              {data.groups.directReports.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleGroup("directReports")}
                    className="flex w-full items-center justify-between rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-xs font-medium hover:bg-white/90 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    <span>Direct reports ({data.groups.directReports.length})</span>
                    <span>{expandedGroups.has("directReports") ? "−" : "+"}</span>
                  </button>
                  {expandedGroups.has("directReports") && (
                    <div className="mt-1 space-y-1 pl-3">
                      {data.groups.directReports.slice(0, 10).map((person) => (
                        <div
                          key={person.id}
                          className={`flex items-center justify-between rounded-lg border border-black/10 bg-white/70 px-2 py-1.5 text-xs dark:border-white/10 dark:bg-white/5 ${
                            onOpenPerson ? "cursor-pointer hover:bg-white/90 dark:hover:bg-white/10" : ""
                          }`}
                          onClick={() => onOpenPerson?.(person.id)}
                        >
                          <div>
                            <div className="font-medium">{person.name}</div>
                            {person.title && (
                              <div className="text-[10px] text-black/50 dark:text-white/50">{person.title}</div>
                            )}
                          </div>
                          {onOpenPerson && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenPerson(person.id);
                              }}
                              className="rounded border border-black/10 bg-white px-1.5 py-0.5 text-[10px] hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                            >
                              Open
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Indirect reports */}
              {data.groups.indirectReports.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleGroup("indirectReports")}
                    className="flex w-full items-center justify-between rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-xs font-medium hover:bg-white/90 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    <span>
                      Indirect reports ({data.groups.indirectReports.length}
                      {data.meta.truncated ? "+" : ""})
                    </span>
                    <span>{expandedGroups.has("indirectReports") ? "−" : "+"}</span>
                  </button>
                  {expandedGroups.has("indirectReports") && (
                    <div className="mt-1 space-y-1 pl-3">
                      {data.groups.indirectReports.slice(0, 10).map((person) => (
                        <div
                          key={person.id}
                          className={`flex items-center justify-between rounded-lg border border-black/10 bg-white/70 px-2 py-1.5 text-xs dark:border-white/10 dark:bg-white/5 ${
                            onOpenPerson ? "cursor-pointer hover:bg-white/90 dark:hover:bg-white/10" : ""
                          }`}
                          onClick={() => onOpenPerson?.(person.id)}
                        >
                          <div>
                            <div className="font-medium">{person.name}</div>
                            {person.title && (
                              <div className="text-[10px] text-black/50 dark:text-white/50">{person.title}</div>
                            )}
                          </div>
                          {onOpenPerson && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenPerson(person.id);
                              }}
                              className="rounded border border-black/10 bg-white px-1.5 py-0.5 text-[10px] hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                            >
                              Open
                            </button>
                          )}
                        </div>
                      ))}
                      {data.meta.truncated && (
                        <div className="px-2 py-1 text-[10px] text-black/50 dark:text-white/50">Truncated</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Team peers */}
              {data.groups.teamPeers.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleGroup("teamPeers")}
                    className="flex w-full items-center justify-between rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-xs font-medium hover:bg-white/90 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    <span>Team peers ({data.groups.teamPeers.length})</span>
                    <span>{expandedGroups.has("teamPeers") ? "−" : "+"}</span>
                  </button>
                  {expandedGroups.has("teamPeers") && (
                    <div className="mt-1 space-y-1 pl-3">
                      {data.groups.teamPeers.slice(0, 10).map((person) => (
                        <div
                          key={person.id}
                          className={`flex items-center justify-between rounded-lg border border-black/10 bg-white/70 px-2 py-1.5 text-xs dark:border-white/10 dark:bg-white/5 ${
                            onOpenPerson ? "cursor-pointer hover:bg-white/90 dark:hover:bg-white/10" : ""
                          }`}
                          onClick={() => onOpenPerson?.(person.id)}
                        >
                          <div>
                            <div className="font-medium">{person.name}</div>
                            {person.title && (
                              <div className="text-[10px] text-black/50 dark:text-white/50">{person.title}</div>
                            )}
                          </div>
                          {onOpenPerson && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenPerson(person.id);
                              }}
                              className="rounded border border-black/10 bg-white px-1.5 py-0.5 text-[10px] hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                            >
                              Open
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Department peers */}
              {data.groups.departmentPeers.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleGroup("departmentPeers")}
                    className="flex w-full items-center justify-between rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-xs font-medium hover:bg-white/90 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    <span>Department peers ({data.groups.departmentPeers.length})</span>
                    <span>{expandedGroups.has("departmentPeers") ? "−" : "+"}</span>
                  </button>
                  {expandedGroups.has("departmentPeers") && (
                    <div className="mt-1 space-y-1 pl-3">
                      {data.groups.departmentPeers.slice(0, 10).map((person) => (
                        <div
                          key={person.id}
                          className={`flex items-center justify-between rounded-lg border border-black/10 bg-white/70 px-2 py-1.5 text-xs dark:border-white/10 dark:bg-white/5 ${
                            onOpenPerson ? "cursor-pointer hover:bg-white/90 dark:hover:bg-white/10" : ""
                          }`}
                          onClick={() => onOpenPerson?.(person.id)}
                        >
                          <div>
                            <div className="font-medium">{person.name}</div>
                            {person.title && (
                              <div className="text-[10px] text-black/50 dark:text-white/50">{person.title}</div>
                            )}
                          </div>
                          {onOpenPerson && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenPerson(person.id);
                              }}
                              className="rounded border border-black/10 bg-white px-1.5 py-0.5 text-[10px] hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                            >
                              Open
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Managers in chain */}
              {data.groups.managersInChain.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleGroup("managersInChain")}
                    className="flex w-full items-center justify-between rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-xs font-medium hover:bg-white/90 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    <span>Managers in chain ({data.groups.managersInChain.length})</span>
                    <span>{expandedGroups.has("managersInChain") ? "−" : "+"}</span>
                  </button>
                  {expandedGroups.has("managersInChain") && (
                    <div className="mt-1 space-y-1 pl-3">
                      {data.groups.managersInChain.slice(0, 10).map((person) => (
                        <div
                          key={person.id}
                          className={`flex items-center justify-between rounded-lg border border-black/10 bg-white/70 px-2 py-1.5 text-xs dark:border-white/10 dark:bg-white/5 ${
                            onOpenPerson ? "cursor-pointer hover:bg-white/90 dark:hover:bg-white/10" : ""
                          }`}
                          onClick={() => onOpenPerson?.(person.id)}
                        >
                          <div>
                            <div className="font-medium">{person.name}</div>
                            {person.title && (
                              <div className="text-[10px] text-black/50 dark:text-white/50">{person.title}</div>
                            )}
                          </div>
                          {onOpenPerson && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenPerson(person.id);
                              }}
                              className="rounded border border-black/10 bg-white px-1.5 py-0.5 text-[10px] hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                            >
                              Open
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      ) : null}
      </Section>
    </div>
  );
}

function ProfilePanel({
  data,
  edit,
  draft,
  setDraft,
  personId,
  onOpenPerson,
}: {
  data: DrawerData;
  edit: boolean;
  draft: any;
  setDraft: (draft: any) => void;
  personId: string;
  onOpenPerson?: (id: string) => void;
}) {
  const p = data.person;

  return (
    <div className="space-y-4">
      <Section title="Basics">
        <Row k="Name" v={p.name} />
        {edit ? (
          <EditField
            label="Email"
            value={draft.email}
            onChange={(v) => setDraft({ ...draft, email: v })}
            placeholder="email@example.com"
          />
        ) : (
          <Row k="Email" v={p.email || "—"} />
        )}
        {edit ? (
          <EditField
            label="Title"
            value={draft.title}
            onChange={(v) => setDraft({ ...draft, title: v })}
            placeholder="e.g. Senior Engineer"
          />
        ) : (
          <Row k="Title" v={p.title || "—"} />
        )}
      </Section>

      <Section title="Role & team">
        {edit ? (
          <EditField
            label="Role"
            value={draft.roleName}
            onChange={(v) => setDraft({ ...draft, roleName: v })}
            placeholder="e.g. Engineer"
          />
        ) : (
          <Row k="Role" v={p.roleName || "Not set"} />
        )}
        {edit ? (
          <EditField
            label="Team"
            value={draft.teamName}
            onChange={(v) => setDraft({ ...draft, teamName: v })}
            placeholder="e.g. Engineering"
          />
        ) : (
          <Row k="Team" v={p.teamName || "Not set"} />
        )}
      </Section>

      <OrgReadinessSection personId={personId} />

      <CoverageSection personId={personId} onOpenPerson={onOpenPerson} />

      <DecisionPathSection personId={personId} onOpenPerson={onOpenPerson} />

      <ImpactRadiusSection personId={personId} onOpenPerson={onOpenPerson} />
    </div>
  );
}

function StructurePanel({
  data,
  edit,
  draft,
  setDraft,
  people,
  personId,
}: {
  data: DrawerData;
  edit: boolean;
  draft: any;
  setDraft: (draft: any) => void;
  people: { id: string; name: string }[];
  personId: string;
}) {
  return (
    <div className="space-y-4">
      <Section title="Reporting line">
        {edit ? (
          <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
            <label className="text-xs text-black/60 dark:text-white/60">
              Manager
              <select
                value={draft.managerId}
                onChange={(e) => setDraft({ ...draft, managerId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-black/10 bg-white px-2 py-1 text-sm outline-none dark:border-white/10 dark:bg-white/10"
              >
                <option value="">No manager</option>
                {people
                  .filter((p) => p.id !== personId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        ) : (
          <Row k="Manager" v={data.manager?.name || "Not set"} />
        )}
        <Row k="Direct reports" v={String(data.directReports.length)} />
      </Section>

      {data.directReports.length ? (
        <Section title="Direct reports (names)">
          <div className="rounded-2xl border border-black/10 bg-white/60 p-3 text-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-wrap gap-2">
              {data.directReports.map((r) => (
                <span
                  key={r.id}
                  className="rounded-full border border-black/10 bg-white/70 px-2 py-1 text-[11px] text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60"
                >
                  {r.name}
                </span>
              ))}
            </div>
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function WorkPanel({ data }: { data: DrawerData }) {
  return (
    <div className="space-y-4">
      <Section title="Project allocations">
        {data.work.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white/60 p-4 text-sm text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
            No project allocations recorded.
          </div>
        ) : (
          <div className="space-y-2">
            {data.work.map((w) => (
              <div
                key={w.projectId}
                className="rounded-2xl border border-black/10 bg-white/60 p-3 text-sm dark:border-white/10 dark:bg-white/5"
              >
                <div className="font-medium">{w.projectName}</div>
                <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                  Fraction: {w.fraction} · {w.startDate ? "From " + w.startDate.slice(0, 10) : "Start —"} ·{" "}
                  {w.endDate ? "To " + w.endDate.slice(0, 10) : "Ongoing"}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function EditField(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
      <label className="text-xs text-black/60 dark:text-white/60">
        {props.label}
        <input
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          className="mt-1 w-full rounded-lg border border-black/10 bg-white px-2 py-1 text-sm outline-none dark:border-white/10 dark:bg-white/10"
        />
      </label>
    </div>
  );
}

