"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MergeReviewPanel } from "./MergeReviewPanel";
import { SuggestionCard } from "./SuggestionCard";
import { useToast } from "./toast";
import { StatusPill } from "./StatusPill";
import { deriveOrgStatus } from "./status";
import type { FocusMode } from "./focus";
import type { LoopBrainEvent } from "@/lib/loopbrain/signals";
import { buildIssueRows, type IssueRow as ImpactIssueRow } from "./IssuesModel";
import { previewFixImpact } from "@/lib/loopbrain/impactPreview";
import { IssueImpactPreview } from "./IssueImpactPreview";

type IssueRow = {
  issue: {
    id: string;
    type: string;
    firstSeenAt: string;
    lastSeenAt: string;
    resolvedAt: string | null;
  };
  person: any;
  impactScore?: number;
  impactReason?: string;
};

function daysSince(dateIso: string) {
  const t = new Date(dateIso).getTime();
  const ms = Date.now() - t;
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function PeopleIssuesTab({
  canEdit,
  focusMode,
  people = [],
  signals = [],
  onOpenPerson,
  onBulkAssignManager,
  computeSuggestionsForPerson,
  issueTypeFromUrl,
  savedView,
}: {
  canEdit: boolean;
  focusMode?: FocusMode;
  people?: any[];
  signals?: LoopBrainEvent[];
  onOpenPerson: (p: any) => void; // opens drawer; caller decides focus
  onBulkAssignManager: (args: { ids: string[]; managerId: string | null; managerName?: string | null }) => Promise<void>;
  computeSuggestionsForPerson: (p: any) => { managerId?: string; managerName?: string; teamName?: string; rationale?: string };
  issueTypeFromUrl?: string | null;
  savedView?: { key: string; title: string; config: any } | null;
}) {
  const isFixMode = focusMode === "fix";
  const guided = Boolean(issueTypeFromUrl);
  const viewMode = savedView ? { key: savedView.key, title: savedView.title } : null;
  const initialTypes = savedView?.config?.issues || (issueTypeFromUrl ? [issueTypeFromUrl] : ["MISSING_MANAGER"]);
  const [types, setTypes] = useState<string[]>(initialTypes);
  const [viewModeActive, setViewModeActive] = useState(Boolean(savedView));
  const [minDays, setMinDays] = useState<number>(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedRow, setExpandedRow] = useState<string | null>(null); // Track which row shows preview
  const [previewRows, setPreviewRows] = useState<any[] | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [suggestionRunId, setSuggestionRunId] = useState<string | null>(null);
  const [engineId, setEngineId] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [minConf, setMinConf] = useState(0.8);
  const [mergePreview, setMergePreview] = useState<any | null>(null);
  const [scanningDuplicates, setScanningDuplicates] = useState(false);
  const [loopBrainEnabled, setLoopBrainEnabled] = useState<boolean | null>(null);
  const { push } = useToast();

  async function loadDuplicates() {
    // Duplicates require API (comparison logic not derivable from people state alone)
    const qs = new URLSearchParams();
    qs.set("minConf", String(minConf));
    const res = await fetch(`/api/org/duplicates?${qs.toString()}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({} as any));
    if (data?.ok) setDuplicates(data.rows || []);
  }

  async function scanDuplicates() {
    setScanningDuplicates(true);
    try {
      const res = await fetch("/api/org/duplicates/sync", { method: "POST" });
      const data = await res.json().catch(() => ({} as any));
      if (data?.ok) {
        await loadDuplicates();
      }
    } catch (error) {
      console.error("Failed to scan duplicates:", error);
    } finally {
      setScanningDuplicates(false);
    }
  }

  // Build issue rows from people state (derived, not stored)
  // Golden Rule: Problems Are Views, Not States
  const rows = useMemo(() => {
    if (types.includes("DUPLICATE_PERSON")) {
      // Duplicates require API (comparison logic not in people state)
      return [];
    }
    
    if (people.length === 0 || signals.length === 0) return [];
    
    // Filter signals by selected types and minDays
    const filteredSignals = signals.filter((s) => {
      if (!types.includes(s.type)) return false;
      if (minDays > 0) {
        const daysSince = (Date.now() - s.occurredAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < minDays) return false;
      }
      return true;
    });

    // Build impact rows (already sorted by impact score desc)
    const impactRows = buildIssueRows({
      people,
      signals: filteredSignals,
      filterTypes: types,
    });

    // Convert to IssueRow format
    return impactRows.map((ir) => {
      const person = people.find((p) => p.id === ir.personId);
      if (!person) return null;
      
      return {
        issue: {
          id: `signal-${ir.personId}-${ir.issueTypes.join("-")}`,
          type: ir.issueTypes[0] || "UNKNOWN",
          firstSeenAt: ir.signals[0]?.occurredAt.toISOString() || new Date().toISOString(),
          lastSeenAt: ir.signals[ir.signals.length - 1]?.occurredAt.toISOString() || new Date().toISOString(),
          resolvedAt: null,
        },
        person,
        impactScore: ir.impactScore,
        impactReason: ir.impactReason,
      };
    }).filter((r): r is IssueRow => r !== null);
  }, [people, signals, types, minDays]);

  // Load duplicates (special case - requires API)
  useEffect(() => {
    if (types.includes("DUPLICATE_PERSON")) {
      loadDuplicates();
    }
    // Listen for merge updates to reload duplicates
    const handler = () => {
      if (types.includes("DUPLICATE_PERSON")) {
        loadDuplicates();
      }
    };
    window.addEventListener("merges-updated", handler);
    return () => window.removeEventListener("merges-updated", handler);
  }, [types, minConf]);

  // Apply saved view config when it changes
  useEffect(() => {
    if (savedView?.config) {
      const config = savedView.config;
      if (config.issues && Array.isArray(config.issues)) {
        setTypes(config.issues);
        setViewModeActive(true);
      }
    } else {
      setViewModeActive(false);
    }
  }, [savedView]);

  // Auto-select all rows when guided
  useEffect(() => {
    if (guided && rows.length > 0 && selected.size === 0) {
      setSelected(new Set(rows.map((r) => r.person.id)));
    }
  }, [guided, rows, selected]);

  // Check LoopBrain rollout eligibility
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/org/loopbrain/rollout", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (data?.ok) {
          const cfg = data.config;
          // Simplified check: if no config or enabled=true, allow (full role/team check would be server-side)
          setLoopBrainEnabled(cfg?.enabled !== false);
        } else {
          setLoopBrainEnabled(true); // Default to enabled if no config
        }
      } catch (error) {
        setLoopBrainEnabled(true); // Default to enabled on error
      }
    })();
  }, []);

  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const isDuplicateMode = types.includes("DUPLICATE_PERSON");

  async function applySuggestedManagerBulk() {
    // Find the most common computed manager pattern among selected people and apply it.
    const counts = new Map<string, { id: string; name?: string; n: number }>();
    for (const r of rows) {
      if (!selected.has(r.person.id)) continue;
      const s = computeSuggestionsForPerson(r.person);
      if (!s.managerId) continue;
      const cur = counts.get(s.managerId) || { id: s.managerId, name: s.managerName, n: 0 };
      cur.n += 1;
      counts.set(s.managerId, cur);
    }
    let best: { id: string; name?: string; n: number } | null = null;
    for (const v of counts.values()) if (!best || v.n > best.n) best = v;
    if (!best) return;

    await onBulkAssignManager({ ids: selectedIds, managerId: best.id, managerName: best.name || null });
    setSelected(new Set());
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-black/90 dark:text-white/90">
              {isDuplicateMode ? "Duplicate people" : "Issues triage"}
            </div>
            <div className="mt-1 text-xs text-black/50 dark:text-white/50">
              {isDuplicateMode ? "Review and merge duplicate records." : "Focused queue for resolving structural gaps at scale."}
            </div>
            {viewModeActive && viewMode ? (
              <div className="mt-2 text-xs text-black/40 dark:text-white/40">
                View mode: {viewMode.title}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              multiple
              value={types}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
                setTypes(selected.length > 0 ? selected : ["MISSING_MANAGER"]);
                setViewModeActive(false); // User manually changed, exit view mode
              }}
              disabled={guided || viewModeActive}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black disabled:opacity-50"
              size={4}
            >
              <option value="MISSING_MANAGER">Missing manager</option>
              <option value="MISSING_TEAM">Missing team</option>
              <option value="MISSING_ROLE">Missing role</option>
              <option value="DUPLICATE_PERSON">Duplicate people</option>
            </select>

            {types.includes("DUPLICATE_PERSON") ? (
              <>
                <select
                  value={String(minConf)}
                  onChange={(e) => setMinConf(Number(e.target.value))}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black"
                >
                  <option value="0.7">Confidence ≥ 70%</option>
                  <option value="0.8">Confidence ≥ 80%</option>
                  <option value="0.9">Confidence ≥ 90%</option>
                  <option value="0.95">Confidence ≥ 95%</option>
                </select>
                <button
                  type="button"
                  onClick={scanDuplicates}
                  disabled={scanningDuplicates || !canEdit}
                  className="rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10 disabled:opacity-50"
                >
                  {scanningDuplicates ? "Scanning…" : "Scan duplicates"}
                </button>
              </>
            ) : null}

            <select
              value={String(minDays)}
              onChange={(e) => setMinDays(Number(e.target.value))}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black"
            >
              <option value="0">All ages</option>
              <option value="3">3+ days</option>
              <option value="7">7+ days</option>
              <option value="14">14+ days</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-black/50 dark:text-white/50">
            {types.includes("DUPLICATE_PERSON") ? `${duplicates.length} duplicate candidates` : `${rows.length} open issues`}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set(rows.map((r) => r.person.id)))}
              className="rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
            >
              Clear
            </button>

            <button
              type="button"
              disabled={!canEdit || selectedIds.length === 0}
              onClick={applySuggestedManagerBulk}
              className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white disabled:bg-black/10 disabled:text-black/40 dark:bg-white dark:text-black dark:disabled:bg-white/10 dark:disabled:text-white/40"
            >
              Apply common manager (bulk)
            </button>

            {loopBrainEnabled === false ? (
              <div className="text-xs text-black/50 dark:text-white/50">
                LoopBrain suggestions are not enabled for your role.
              </div>
            ) : (
              <button
                type="button"
                disabled={!canEdit || selectedIds.length === 0 || loopBrainEnabled === null}
                className={[
                  "rounded-xl px-3 py-2 text-sm font-medium text-white disabled:bg-black/10 disabled:text-black/40 dark:bg-white dark:text-black dark:disabled:bg-white/10 dark:disabled:text-white/40",
                  guided ? "bg-black ring-2 ring-black/20 dark:bg-white dark:ring-white/20" : "bg-black",
                ].join(" ")}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await fetch("/api/org/issues/preview", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ personIds: selectedIds }),
                    });
                    const data = await res.json();
                    if (data?.ok) {
                      setPreviewRows(data.preview || []);
                      setSuggestionRunId(data.suggestionRunId || null);
                      setEngineId(data.engineId || null);
                      setExcluded(new Set()); // Reset exclusions
                    } else {
                      push({ tone: "error", title: "Preview failed", message: data?.error || "Could not generate preview." });
                    }
                  } catch (error) {
                    push({ tone: "error", title: "Preview failed", message: "Could not generate preview." });
                  } finally {
                    setLoading(false);
                  }
                }}
                className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white disabled:bg-black/10 disabled:text-black/40 dark:bg-white dark:text-black dark:disabled:bg-white/10 dark:disabled:text-white/40"
              >
                Resolve with LoopBrain
              </button>
            )}
          </div>
        </div>
      </div>

      {isDuplicateMode ? <MergeReviewPanel canEdit={canEdit} /> : null}

      {types.includes("DUPLICATE_PERSON") ? (
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 text-xs text-black/50 dark:border-white/10 dark:text-white/50">
              <tr>
                <th className="px-4 py-3">Person A</th>
                <th className="px-4 py-3">Person B</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {duplicates.map((d) => {
                const conf = Math.round(d.candidate.confidence * 100);
                return (
                  <tr key={d.candidate.id} className="border-b border-black/5 last:border-b-0 dark:border-white/10">
                    <td className="px-4 py-3">
                      <div className="font-medium text-black/90 dark:text-white/90">{d.a.name || "Unnamed"}</div>
                      <div className="text-xs text-black/50 dark:text-white/50">{d.a.email || "—"}</div>
                      <div className="text-xs text-black/50 dark:text-white/50">{d.a.title || d.a.role || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-black/90 dark:text-white/90">{d.b.name || "Unnamed"}</div>
                      <div className="text-xs text-black/50 dark:text-white/50">{d.b.email || "—"}</div>
                      <div className="text-xs text-black/50 dark:text-white/50">{d.b.title || d.b.role || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-black/10 bg-black/5 px-2 py-1 text-xs text-black/60 dark:border-white/10 dark:bg-white/10 dark:text-white/60">
                        {conf}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-black/70 dark:text-white/70">
                      <span className="text-xs">{d.candidate.reason || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenPerson(d.a)}
                          className="rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
                        >
                          Open A
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenPerson(d.b)}
                          className="rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
                        >
                          Open B
                        </button>
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => setMergePreview(d)}
                          className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white disabled:bg-black/10 disabled:text-black/40 dark:bg-white dark:text-black dark:disabled:bg-white/10 dark:disabled:text-white/40"
                        >
                          Merge
                        </button>
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={async () => {
                            const res = await fetch("/api/org/duplicates/dismiss", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: d.candidate.id }),
                            });
                            if (res.ok) await loadDuplicates();
                          }}
                          className="rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
                        >
                          Dismiss
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {duplicates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-black/60 dark:text-white/60">
                    No duplicate candidates found for this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 text-xs text-black/50 dark:border-white/10 dark:text-white/50">
              <tr>
                <th className="px-4 py-3 w-[44px]"></th>
                <th className="px-4 py-3">Person</th>
                <th className="px-4 py-3">Issues</th>
                <th className="px-4 py-3">Impact</th>
                <th className="px-4 py-3">Suggestion</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
            {rows.map((r) => {
              const isSel = selected.has(r.person.id);
              const isExpanded = expandedRow === r.person.id;
              const age = daysSince(r.issue.firstSeenAt);
              const s = computeSuggestionsForPerson(r.person);
              const status = deriveOrgStatus(r.person);
              
              // Map issue types to labels
              const issueLabels = (r.impactScore !== undefined && r.impactReason)
                ? r.issue.type === "MISSING_MANAGER"
                  ? "Missing reporting line"
                  : r.issue.type === "MISSING_TEAM"
                  ? "Missing team"
                  : r.issue.type === "MISSING_ROLE"
                  ? "Missing role"
                  : r.issue.type
                : null;

              // Compute impact preview for this person
              const preview = previewFixImpact({
                person: r.person,
                signals,
                totalPeople: people.length,
              });

              return (
                <React.Fragment key={r.issue.id}>
                  <tr className="dark:border-white/10">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={(e) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(r.person.id);
                          else next.delete(r.person.id);
                          return next;
                        });
                      }}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-black/90 dark:text-white/90">
                          {r.person.name || r.person.fullName || "Unnamed"}
                        </div>
                        <div className="text-xs text-black/50 dark:text-white/50">
                          {(r.person.title || r.person.role || "").toString()}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <StatusPill status={status} />
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-xs text-black/70 dark:text-white/70">
                      {issueLabels || "—"}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {r.impactScore !== undefined && r.impactScore > 0 ? (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex w-fit rounded-full border border-black/10 bg-black/5 px-2 py-0.5 text-xs font-medium text-black/70 dark:border-white/10 dark:bg-white/10 dark:text-white/70">
                          Impact {r.impactScore}
                        </span>
                        {r.impactReason ? (
                          <span className="text-xs text-black/50 dark:text-white/50" title={r.impactReason}>
                            {r.impactReason}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-black/40 dark:text-white/40">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {s.managerName || s.teamName ? (
                      <button
                        type="button"
                        onClick={() => {
                          // View suggestion detail - could expand inline or open drawer
                          onOpenPerson(r.person);
                        }}
                        className="text-xs text-black/70 underline underline-offset-2 hover:text-black dark:text-white/70 dark:hover:text-white"
                      >
                        View suggestion
                      </button>
                    ) : (
                      <span className="text-xs text-black/50 dark:text-white/50">No suggestion</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      {!isFixMode ? (
                        <button
                          type="button"
                          onClick={() => onOpenPerson(r.person)}
                          className="rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
                        >
                          Open
                        </button>
                      ) : null}

                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => {
                          // Route to assignment drawer based on issue type
                          onOpenPerson(r.person);
                        }}
                        onMouseEnter={() => setExpandedRow(r.person.id)}
                        onMouseLeave={() => setExpandedRow(null)}
                        className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white disabled:bg-black/10 disabled:text-black/40 dark:bg-white dark:text-black dark:disabled:bg-white/10 dark:disabled:text-white/40"
                      >
                        {isFixMode ? "Fix" : "Open"}
                      </button>
                    </div>
                  </td>
                </tr>
                {/* Impact preview row - shows on hover/focus */}
                {isExpanded && preview.explanation ? (
                  <tr className="dark:border-white/10">
                    <td colSpan={6} className="px-4 py-3">
                      <IssueImpactPreview preview={preview} />
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-black/60 dark:text-white/60">
                  No open issues found for this filter.
                </td>
              </tr>
            ) : null}
            </tbody>
          </table>
        </div>
      )}

      {/* Merge preview modal */}
      {mergePreview ? (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="max-w-2xl w-full rounded-2xl bg-white p-6 dark:bg-black">
            <h3 className="text-lg font-semibold mb-4">Merge duplicate people</h3>
            <div className="space-y-4">
              <div className="text-sm text-black/70 dark:text-white/70">
                Select which person to keep as the canonical record. The other person's data will be merged into it.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-xl p-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="canonical"
                      value="a"
                      defaultChecked
                      className="w-4 h-4"
                    />
                    <div>
                      <div className="font-medium">{mergePreview.a.name || "Unnamed"}</div>
                      <div className="text-xs text-black/60 dark:text-white/60">{mergePreview.a.email || "—"}</div>
                      <div className="text-xs text-black/60 dark:text-white/60">{mergePreview.a.title || mergePreview.a.role || "—"}</div>
                    </div>
                  </label>
                </div>
                <div className="border rounded-xl p-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="canonical" value="b" className="w-4 h-4" />
                    <div>
                      <div className="font-medium">{mergePreview.b.name || "Unnamed"}</div>
                      <div className="text-xs text-black/60 dark:text-white/60">{mergePreview.b.email || "—"}</div>
                      <div className="text-xs text-black/60 dark:text-white/60">{mergePreview.b.title || mergePreview.b.role || "—"}</div>
                    </div>
                  </label>
                </div>
              </div>
              <div className="text-xs text-black/60 dark:text-white/60">
                <div className="font-medium mb-1">Merge strategy:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Canonical record's non-null values are preserved</li>
                  <li>Missing fields are filled from the merged record</li>
                  <li>Merged record is archived (reversible)</li>
                </ul>
              </div>
            </div>
            <div className="mt-6 flex gap-2 justify-end">
              <button
                onClick={() => setMergePreview(null)}
                className="rounded-xl border border-black/10 px-4 py-2 text-sm dark:border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const form = document.querySelector('input[name="canonical"]:checked') as HTMLInputElement;
                  const canonical = form?.value === "a" ? mergePreview.a : mergePreview.b;
                  const merged = form?.value === "a" ? mergePreview.b : mergePreview.a;

                  const res = await fetch("/api/org/duplicates/merge", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      candidateId: mergePreview.candidate.id,
                      canonicalId: canonical.id,
                      mergedId: merged.id,
                    }),
                  });
                  const data = await res.json();
                  if (data?.ok) {
                    setMergePreview(null);
                    await loadDuplicates();
                    // Reload merge review panel
                    const mergeRes = await fetch("/api/org/merges", { cache: "no-store" });
                    const mergeData = await mergeRes.json().catch(() => ({} as any));
                    if (mergeData?.ok) {
                      // Trigger MergeReviewPanel reload by key change or state update
                      window.dispatchEvent(new Event("merges-updated"));
                    }
                    if (onSyncIssues) {
                      await onSyncIssues();
                    }
                  }
                }}
                className="rounded-xl bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
              >
                Confirm merge
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Preview modal */}
      {previewRows ? (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full rounded-2xl bg-white p-6 dark:bg-black max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-black/90 dark:text-white/90">Preview changes</h3>
                <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                  Review field-level changes. Uncheck rows to exclude from batch.
                </p>
              </div>
              {engineId ? (
                <span className="rounded-full border border-black/10 bg-black/5 px-2 py-1 text-xs text-black/60 dark:border-white/10 dark:bg-white/10 dark:text-white/60">
                  Engine: {engineId}
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex-1 overflow-auto">
              <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-black/10 bg-black/5 text-xs text-black/50 dark:border-white/10 dark:bg-white/10 dark:text-white/50">
                    <tr>
                      <th className="px-4 py-3 w-[44px]">
                        <input
                          type="checkbox"
                          checked={previewRows.length > 0 && previewRows.every((p) => !excluded.has(p.personId))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExcluded(new Set());
                            } else {
                              setExcluded(new Set(previewRows.map((p) => p.personId)));
                            }
                          }}
                        />
                      </th>
                      <th className="px-4 py-3">Person</th>
                      <th className="px-4 py-3">Confidence</th>
                      <th className="px-4 py-3">Changes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((p) => {
                      const isExcluded = excluded.has(p.personId);
                      return (
                        <tr
                          key={p.personId}
                          className={`border-b border-black/5 last:border-b-0 dark:border-white/10 ${isExcluded ? "opacity-50" : ""}`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={!isExcluded}
                              onChange={(e) => {
                                setExcluded((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) {
                                    next.delete(p.personId);
                                  } else {
                                    next.add(p.personId);
                                  }
                                  return next;
                                });
                              }}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-black/90 dark:text-white/90">{p.person.name || "Unnamed"}</div>
                            <div className="text-xs text-black/50 dark:text-white/50">{p.person.email || ""}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full border border-black/10 bg-black/5 px-2 py-1 text-xs text-black/60 dark:border-white/10 dark:bg-white/10 dark:text-white/60">
                              {Math.round((p.confidence || 0) * 100)}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {p.diffs && p.diffs.length > 0 ? (
                              <div className="space-y-1">
                                {p.diffs.map((d: any, idx: number) => (
                                  <div key={idx} className="text-xs">
                                    <span className="font-medium">{d.field}:</span>{" "}
                                    <span className="text-black/50 dark:text-white/50">{d.before || "—"}</span> →{" "}
                                    <span className="font-medium text-emerald-700 dark:text-emerald-400">{d.after || "—"}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-black/50 dark:text-white/50">No changes</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="text-sm text-black/60 dark:text-white/60">
                {previewRows.length - excluded.size} of {previewRows.length} selected
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPreviewRows(null);
                    setExcluded(new Set());
                    setSuggestionRunId(null);
                    setEngineId(null);
                  }}
                  className="rounded-xl border border-black/10 px-4 py-2 text-sm dark:border-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const actions = previewRows
                      .filter((p) => !excluded.has(p.personId))
                      .map((p) => ({ personId: p.personId, patch: p.patch }));

                    if (actions.length === 0) {
                      push({ tone: "error", title: "No actions", message: "Please select at least one row to apply." });
                      return;
                    }

                    setLoading(true);
                    try {
                      const res = await fetch("/api/org/issues/apply", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          actions,
                          ...(suggestionRunId ? { suggestionRunId } : {}),
                        }),
                      });
                      const data = await res.json();
                      if (data?.ok) {
                        // If some rows were excluded, send partial feedback
                        if (excluded.size > 0 && suggestionRunId) {
                          await fetch("/api/org/loopbrain/feedback", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              suggestionRunId,
                              partiallyApplied: true,
                              feedback: `${excluded.size} rows excluded from batch apply`,
                            }),
                          }).catch(() => null);
                        }

                        push({
                          tone: "success",
                          title: "Applied",
                          message: `Applied suggestions to ${actions.length} people.`,
                        });
                        setPreviewRows(null);
                        setExcluded(new Set());
                        setSelected(new Set());
                        setSuggestionRunId(null);
                        setEngineId(null);
                        // Issues will update automatically when people state changes (derived view)
                      } else {
                        push({ tone: "error", title: "Apply failed", message: data?.error || "Could not apply changes." });
                      }
                    } catch (error) {
                      push({ tone: "error", title: "Apply failed", message: "Could not apply changes." });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading || previewRows.length - excluded.size === 0}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:bg-black/10 disabled:text-black/40 dark:bg-white dark:text-black dark:disabled:bg-white/10 dark:disabled:text-white/40"
                >
                  {loading ? "Applying..." : `Apply (${previewRows.length - excluded.size})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

