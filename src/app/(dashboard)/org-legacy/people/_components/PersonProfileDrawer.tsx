import React, { useMemo, useState, useEffect, useRef } from "react";
import { SuggestionCard } from "./SuggestionCard";
import { previewFixImpact } from "@/lib/loopbrain/impactPreview";
import { IssueImpactPreview } from "./IssueImpactPreview";
import type { LoopBrainEvent } from "@/lib/loopbrain/signals";
import { RecentChanges } from "./RecentChanges";

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

type ManagerOption = { id: string; name: string };
type TeamOption = { name: string };

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
  return !p.managerId;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/10 bg-black/5 px-2 py-1 text-xs text-black/70 dark:border-white/10 dark:bg-white/10 dark:text-white/70">
      {children}
    </span>
  );
}

export function PersonProfileDrawer({
  open,
  person,
  managers,
  teams,
  canEdit,
  onClose,
  onPersistPatch,
  initialFocus = "default",
  suggestions,
  signals = [],
  totalPeople = 1,
}: {
  open: boolean;
  person: Person | null;
  managers: ManagerOption[];
  teams: TeamOption[];
  canEdit: boolean;
  onClose: () => void;
  onPersistPatch: (args: {
    id: string;
    patch: { managerId?: string | null; managerName?: string | null; teamName?: string | null };
  }) => Promise<void>;
  initialFocus?: "quickFix" | "default";
  suggestions?: {
    managerId?: string;
    managerName?: string;
    teamName?: string;
    rationale?: string;
    confidence?: number;
    evidence?: Array<{ label: string; value: string }>;
    suggestionRunId?: string;
  };
  signals?: LoopBrainEvent[];
  totalPeople?: number;
  orgId?: string;
}) {
  const isArchived = !!person?.archivedAt;
  const effectiveCanEdit = canEdit && !isArchived;

  const computed = useMemo(() => {
    if (!person) return null;

    const incomplete = isIncomplete(person);
    const statusLabel = incomplete ? "Incomplete" : "Complete";
    const statusTone = incomplete ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300";
    const reason = incomplete ? "Missing reporting line" : "No critical issues detected";

    return { incomplete, statusLabel, statusTone, reason };
  }, [person]);

  const [managerId, setManagerId] = useState<string>("");
  const [teamName, setTeamName] = useState<string>("");
  const [savingManager, setSavingManager] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "quickFix">("profile");
  const quickFixRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !person) return;
    setManagerId(person.managerId || "");
    setTeamName((person.teamName || person.team || "") as string);
    // Set initial tab based on initialFocus prop
    setActiveTab(initialFocus === "quickFix" ? "quickFix" : "profile");
  }, [open, person, initialFocus]);

  // Auto-scroll to quick fix section when opened in quick fix mode
  useEffect(() => {
    if (open && initialFocus === "quickFix" && quickFixRef.current) {
      setTimeout(() => {
        quickFixRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [open, initialFocus]);

  async function saveManager() {
    if (!person) return;
    setSavingManager(true);
    try {
      const m = managers.find((x) => x.id === managerId);
      await onPersistPatch({
        id: person.id,
        patch: {
          managerId: managerId || null,
          managerName: m?.name ?? null,
        },
      });
    } catch (e: any) {
      // Error is handled by parent via toast/error notice
      throw e;
    } finally {
      setSavingManager(false);
    }
  }

  async function saveTeam() {
    if (!person) return;
    setSavingTeam(true);
    try {
      await onPersistPatch({
        id: person.id,
        patch: {
          teamName: teamName || null,
        },
      });
    } catch (e: any) {
      // Error is handled by parent via toast/error notice
      throw e;
    } finally {
      setSavingTeam(false);
    }
  }

  function applySuggestionsToFields() {
    if (!suggestions) return;
    if (suggestions.managerId !== undefined) setManagerId(suggestions.managerId || "");
    if (suggestions.teamName !== undefined) setTeamName(suggestions.teamName || "");
  }

  async function applyAndSaveSuggestions() {
    if (!person || !suggestions) return;
    if (!confirm("Apply computed assignments?")) return;
    // Apply to local state first
    applySuggestionsToFields();
    // Persist manager if present
    if (suggestions.managerId !== undefined) {
      const m = managers.find((x) => x.id === (suggestions.managerId || ""));
      await onPersistPatch({
        id: person.id,
        patch: { managerId: suggestions.managerId || null, managerName: m?.name ?? suggestions.managerName ?? null },
      });
    }
    // Persist team if present
    if (suggestions.teamName !== undefined) {
      await onPersistPatch({
        id: person.id,
        patch: { teamName: suggestions.teamName || null },
      });
    }

    // Send feedback that suggestion was accepted
    if (suggestions.suggestionRunId) {
      await fetch("/api/org/loopbrain/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: person.id,
          suggestionRunId: suggestions.suggestionRunId,
          confidence: suggestions.confidence,
          accepted: true,
        }),
      }).catch(() => null);
    }
  }

  return (
    <>
      <div
        className={[
          "fixed inset-0 z-40 transition",
          open ? "pointer-events-auto bg-black/25 opacity-100" : "pointer-events-none bg-transparent opacity-0",
        ].join(" ")}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={[
          "fixed right-0 top-0 z-50 h-full w-full max-w-[520px] transform border-l border-black/10 bg-white shadow-2xl transition duration-200 ease-out dark:border-white/10 dark:bg-black",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="Person profile drawer"
      >
        <div className="flex h-full flex-col">
          {isArchived ? (
            <div className="border-b border-amber-200/60 bg-amber-50/60 p-4 dark:border-amber-400/30 dark:bg-amber-400/10">
              <div className="text-sm text-black/80 dark:text-white/80">
                <span className="font-semibold">Archived</span>
                {person.mergedIntoId ? (
                  <>
                    {" "}(merged into{" "}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        // Could trigger opening canonical person drawer here if we had access to people list
                      }}
                      className="underline hover:no-underline"
                    >
                      {person.mergedIntoId}
                    </button>
                    )
                  </>
                ) : (
                  " (archived)"
                )}
              </div>
              <div className="mt-1 text-xs text-black/60 dark:text-white/60">
                This record is read-only. Editing is disabled.
              </div>
            </div>
          ) : null}
          <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4 dark:border-white/10">
            <div className="min-w-0">
              <div className="text-lg font-semibold tracking-[-0.02em] text-black dark:text-white">
                {person ? safeName(person) : "Profile"}
              </div>
              <div className="mt-1 text-sm text-black/60 dark:text-white/60">
                {person ? safeRole(person) : ""}
              </div>
              {person ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Pill>{safeTeam(person)}</Pill>
                  {person.location ? <Pill>{person.location}</Pill> : null}
                  {typeof person.directReportCount === "number" && person.directReportCount > 0 ? (
                    <Pill>Manager · {person.directReportCount} reports</Pill>
                  ) : null}
                  {computed ? (
                    <Pill>
                      <span className={computed.statusTone}>Status: {computed.statusLabel}</span>
                    </Pill>
                  ) : null}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-3 py-2 text-sm font-medium text-black/70 hover:bg-black/5 hover:text-black focus:outline-none focus:ring-2 focus:ring-black/20 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white dark:focus:ring-white/20"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-auto px-5 py-4">
            {!person ? (
              <div className="rounded-2xl border border-black/10 bg-black/5 p-4 text-sm text-black/70 dark:border-white/10 dark:bg-white/10 dark:text-white/70">
                Select a person to view details.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Tab navigation */}
                <div className="flex gap-2 border-b border-black/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setActiveTab("profile")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === "profile"
                        ? "border-black text-black dark:border-white dark:text-white"
                        : "border-transparent text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
                    }`}
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("quickFix")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === "quickFix"
                        ? "border-black text-black dark:border-white dark:text-white"
                        : "border-transparent text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
                    }`}
                  >
                    Quick fix
                  </button>
                </div>

                {/* Missing fields when in quick fix mode */}
                {activeTab === "quickFix" && computed?.incomplete ? (
                  <div className="rounded-xl border border-amber-300/60 bg-amber-50/60 p-3 text-sm dark:border-amber-400/30 dark:bg-amber-400/10">
                    <div className="font-medium text-black/90 dark:text-white/90">Missing fields</div>
                    <div className="mt-1 text-black/70 dark:text-white/70">
                      {!person.managerId ? "Reporting line not set" : !(person.teamName || person.team) ? "Team not set" : !(person.title || person.role) ? "Role not set" : "All fields complete"}
                    </div>
                  </div>
                ) : null}

                {/* Quick Fix (real) */}
                {activeTab === "quickFix" ? (
                  <div
                    ref={quickFixRef}
                    className="space-y-4"
                  >
                    {/* Impact preview */}
                    {person && signals.length > 0 ? (
                      <IssueImpactPreview
                        preview={previewFixImpact({
                          person,
                          signals,
                          totalPeople,
                        })}
                      />
                    ) : null}

                  <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                  <div className="text-sm font-semibold text-black/90 dark:text-white/90">
                    Quick fix
                  </div>
                  <div className="mt-1 text-sm text-black/60 dark:text-white/60">
                    Fix structural gaps without leaving the page.
                  </div>

                  {!effectiveCanEdit ? (
                    <div className="mt-2 text-sm text-black/60 dark:text-white/60">
                      Read-only access: quick fixes are disabled.
                    </div>
                  ) : null}

                  {computed?.incomplete ? (
                    <div className="mt-3 rounded-xl border border-amber-300/60 bg-amber-50/60 p-3 text-sm text-black/70 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-white/70">
                      <div className="font-medium">Blocking org clarity</div>
                      <div className="mt-1 text-black/60 dark:text-white/60">
                        Reason: {computed.reason}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="text-xs font-medium text-black/70 dark:text-white/70">
                        Manager
                      </div>
                      <div className="mt-2 flex gap-2">
                        <select
                          value={managerId}
                          onChange={(e) => setManagerId(e.target.value)}
                          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 shadow-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white/80 dark:focus:ring-white/20"
                        >
                          <option value="">Not set</option>
                          {managers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={saveManager}
                          disabled={savingManager || !effectiveCanEdit}
                          className={[
                            "shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2",
                            savingManager || !effectiveCanEdit
                              ? "bg-black/10 text-black/40 dark:bg-white/10 dark:text-white/40"
                              : "bg-black text-white hover:bg-black/90 focus:ring-black/30 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/30",
                          ].join(" ")}
                        >
                          {savingManager ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-black/70 dark:text-white/70">
                        Team
                      </div>
                      <div className="mt-2 flex gap-2">
                        <select
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 shadow-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:bg-black dark:text-white/80 dark:focus:ring-white/20"
                        >
                          <option value="">Not set</option>
                          {teams.map((t) => (
                            <option key={t.name} value={t.name}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={saveTeam}
                          disabled={savingTeam || !effectiveCanEdit}
                          className={[
                            "shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2",
                            savingTeam || !effectiveCanEdit
                              ? "bg-black/10 text-black/40 dark:bg-white/10 dark:text-white/40"
                              : "bg-black text-white hover:bg-black/90 focus:ring-black/30 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/30",
                          ].join(" ")}
                        >
                          {savingTeam ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>
                  </div>
                  </div>
                  </div>
                ) : null}

                {/* Profile tab content */}
                {activeTab === "profile" ? (
                  <>
                {/* LoopBrain Suggestions */}
                {suggestions && (suggestions.managerId || suggestions.teamName) ? (
                  <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                    <div className="text-sm font-semibold text-black/90 dark:text-white/90 mb-3">
                      LoopBrain suggestion
                    </div>
                    <SuggestionCard
                      confidence={suggestions.confidence ?? 0.5}
                      rationale={suggestions.rationale || "No rationale available"}
                      evidence={suggestions.evidence}
                      personId={person.id}
                      suggestionRunId={suggestions.suggestionRunId}
                      onFeedback={async (accepted) => {
                        // When user dismisses/ignores suggestion, send accepted=false feedback
                        if (!accepted && suggestions.suggestionRunId) {
                          await fetch("/api/org/loopbrain/feedback", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              personId: person.id,
                              suggestionRunId: suggestions.suggestionRunId,
                              confidence: suggestions.confidence,
                              accepted: false,
                            }),
                          }).catch(() => null);
                        }
                      }}
                    />
                    {effectiveCanEdit ? (
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={applySuggestionsToFields}
                          className="rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm font-medium text-black/70 hover:bg-black/5 hover:text-black focus:outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white dark:focus:ring-white/20"
                        >
                          Apply to fields
                        </button>
                        <button
                          type="button"
                          onClick={applyAndSaveSuggestions}
                          className="rounded-xl bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-black/30 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/30"
                        >
                          Apply &amp; save
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-black/50 dark:text-white/50">
                        Read-only: suggestions cannot be applied to archived records.
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Details */}
                <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                  <div className="text-sm font-semibold text-black/90 dark:text-white/90">
                    Details
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-black/70 dark:text-white/70">
                    <div className="flex justify-between gap-4">
                      <span className="text-black/50 dark:text-white/50">Manager</span>
                      <span className="text-right">{person.managerName || (person.managerId ? "Set" : "Not set")}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-black/50 dark:text-white/50">Team</span>
                      <span className="text-right">{safeTeam(person)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-black/50 dark:text-white/50">Role</span>
                      <span className="text-right">{safeRole(person)}</span>
                    </div>
                  </div>
                </div>

                {/* Recent fixes (collapsed by default) */}
                {person && orgId ? (
                  <details className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                    <summary className="cursor-pointer text-sm font-semibold text-black/90 dark:text-white/90">
                      Recent fixes
                    </summary>
                    <div className="mt-3">
                      <RecentChanges orgId={orgId} personId={person.id} limit={2} />
                    </div>
                  </details>
                ) : null}
                  </>
                ) : null}
              </div>
            )}
          </div>

          <div className="border-t border-black/10 px-5 py-4 dark:border-white/10">
            <div className="text-xs text-black/50 dark:text-white/50">
              Enterprise UX: fix fast, keep signals quiet.
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
