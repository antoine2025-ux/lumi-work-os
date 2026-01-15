"use client";

import React, { useEffect, useState } from "react";
import { SettingsNav } from "../_components/SettingsNav";
import { OutcomeSummary } from "./_components/OutcomeSummary";
import { DigestPreview } from "./_components/DigestPreview";

export default function LoopBrainSettingsPage() {
  const [days, setDays] = useState(14);
  const [engines, setEngines] = useState<any[]>([]);
  const [config, setConfig] = useState<any | null>(null);
  const [rolloutConfig, setRolloutConfig] = useState<any | null>(null);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [digestConfig, setDigestConfig] = useState<any | null>(null);
  const [digestPreview, setDigestPreview] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<"VIEWER" | "EDITOR" | "ADMIN">("VIEWER");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const e = await fetch("/api/org/loopbrain/engines", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);
    if (e?.ok) {
      setEngines(e.engines || []);
      setConfig(e.config || null);
    }

    const r = await fetch("/api/org/loopbrain/rollout", { cache: "no-store" })
      .then((res) => res.json())
      .catch(() => null);
    if (r?.ok) {
      setRolloutConfig(r.config || null);
    }

    const m = await fetch(`/api/org/loopbrain/metrics?days=${days}`, { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);
    if (m?.ok) setMetrics(m);

    const d = await fetch("/api/org/digest/config", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);
    if (d?.ok) setDigestConfig(d.config);

    setLoading(false);
  }

  useEffect(() => {
    load();
    (async () => {
      const res = await fetch("/api/org/permissions");
      const data = await res.json().catch(() => ({} as any));
      if (data?.ok) setUserRole(data.role);
    })();
  }, [days]);

  async function save(next: { engineId: string; enabled: boolean }) {
    const res = await fetch("/api/org/loopbrain/engines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const data = await res.json().catch(() => null);
    if (data?.ok) {
      setConfig(data.config);
      await load();
    } else {
      alert(data?.error || "Failed");
    }
  }

  async function saveRollout(next: { mode: string; teamName?: string; enabled: boolean }) {
    const res = await fetch("/api/org/loopbrain/rollout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const data = await res.json().catch(() => null);
    if (data?.ok) {
      setRolloutConfig(data.config);
      await load();
    } else {
      alert(data?.error || "Failed");
    }
  }

  async function saveDigestConfig(next: { enabled: boolean; recipients: any[] }) {
    const res = await fetch("/api/org/digest/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const data = await res.json().catch(() => null);
    if (data?.ok) {
      setDigestConfig(data.config);
      await load();
    } else {
      alert(data?.error || "Failed");
    }
  }

  async function previewDigest() {
    const res = await fetch("/api/org/digest/preview", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (data?.ok) {
      setDigestPreview(data.digest);
    } else {
      alert(data?.error || "Failed to generate preview");
    }
  }

  const activeEngineId = config?.engineId || (engines[0]?.id ?? "");
  const enabled = config?.enabled ?? true;

  return (
    <div className="px-6 py-6">
      <div className="max-w-4xl space-y-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <SettingsNav role={userRole} />
          </div>
          <div className="lg:col-span-3 space-y-6">
            <div>
              <h1 className="text-xl font-semibold">LoopBrain</h1>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                Configure suggestion engine and monitor adoption & quality signals.
              </p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5 space-y-3">
              <div className="text-sm font-semibold">Engine control</div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={activeEngineId}
                  onChange={(e) => save({ engineId: e.target.value, enabled })}
                  disabled={userRole !== "ADMIN"}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black disabled:opacity-50"
                >
                  {engines.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.id}
                    </option>
                  ))}
                </select>

                <label className="inline-flex items-center gap-2 text-sm text-black/70 dark:text-white/70">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => save({ engineId: activeEngineId, enabled: e.target.checked })}
                    disabled={userRole !== "ADMIN"}
                    className="disabled:opacity-50"
                  />
                  Enabled
                </label>
              </div>

              <div className="text-xs text-black/50 dark:text-white/50">
                When disabled, LoopBrain falls back to a safe default engine (heuristic).
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5 space-y-3">
              <div className="text-sm font-semibold">Rollout control</div>

              <div className="flex flex-col gap-2">
                <select
                  value={rolloutConfig?.mode || "ALL"}
                  onChange={(e) => {
                    const mode = e.target.value;
                    saveRollout({
                      mode,
                      teamName: mode === "TEAM" ? rolloutConfig?.teamName || "" : undefined,
                      enabled: rolloutConfig?.enabled ?? true,
                    });
                  }}
                  disabled={userRole !== "ADMIN"}
                  className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black disabled:opacity-50"
                >
                  <option value="ALL">Everyone</option>
                  <option value="ADMIN_ONLY">Admins only</option>
                  <option value="MANAGERS_ONLY">Managers only</option>
                  <option value="TEAM">Specific team</option>
                </select>

                {rolloutConfig?.mode === "TEAM" ? (
                  <input
                    type="text"
                    value={rolloutConfig?.teamName || ""}
                    onChange={(e) => {
                      saveRollout({
                        mode: "TEAM",
                        teamName: e.target.value,
                        enabled: rolloutConfig?.enabled ?? true,
                      });
                    }}
                    placeholder="Team name"
                    disabled={userRole !== "ADMIN"}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black disabled:opacity-50"
                  />
                ) : null}

                <label className="inline-flex items-center gap-2 text-sm text-black/70 dark:text-white/70">
                  <input
                    type="checkbox"
                    checked={rolloutConfig?.enabled ?? true}
                    onChange={(e) => {
                      saveRollout({
                        mode: rolloutConfig?.mode || "ALL",
                        teamName: rolloutConfig?.teamName || undefined,
                        enabled: e.target.checked,
                      });
                    }}
                    disabled={userRole !== "ADMIN"}
                    className="disabled:opacity-50"
                  />
                  Enabled
                </label>
              </div>

              <div className="text-xs text-black/50 dark:text-white/50">
                Control who can see and use LoopBrain suggestions. Useful for staged rollout.
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Metrics</div>
                <select
                  value={String(days)}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black"
                >
                  <option value="7">Last 7 days</option>
                  <option value="14">Last 14 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>

              {loading ? (
                <div className="text-sm text-black/60 dark:text-white/60">Loading…</div>
              ) : !metrics ? (
                <div className="text-sm text-black/60 dark:text-white/60">No metrics available</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {[
                      ["Runs", metrics.totals.runCount],
                      ["Feedback", metrics.totals.feedbackCount],
                      ["Accepted", metrics.totals.acceptedCount],
                      ["Rejected", metrics.totals.rejectedCount],
                      ["Partial", metrics.totals.partialCount],
                    ].map(([label, value]) => (
                      <div
                        key={label as string}
                        className="rounded-xl border border-black/10 bg-white/60 p-3 text-sm dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="text-xs text-black/50 dark:text-white/50">{label}</div>
                        <div className="mt-1 text-lg font-semibold text-black/90 dark:text-white/90">{value as any}</div>
                      </div>
                    ))}
                  </div>

                  {metrics?.byEngine?.length ? (
                    <div className="mt-3 overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-black/10 text-xs text-black/50 dark:border-white/10 dark:text-white/50">
                          <tr>
                            <th className="px-3 py-2">Engine</th>
                            <th className="px-3 py-2">Runs</th>
                            <th className="px-3 py-2">Accepted</th>
                            <th className="px-3 py-2">Rejected</th>
                            <th className="px-3 py-2">Partial</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.byEngine.map((r: any) => (
                            <tr key={r.engineId} className="border-b border-black/5 last:border-b-0 dark:border-white/10">
                              <td className="px-3 py-2 font-medium">{r.engineId}</td>
                              <td className="px-3 py-2">{r.runs}</td>
                              <td className="px-3 py-2">{r.accepted}</td>
                              <td className="px-3 py-2">{r.rejected}</td>
                              <td className="px-3 py-2">{r.partial}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </>
              )}

              {metrics?.latestOutcome ? (
                <div className="mt-3">
                  <OutcomeSummary metrics={metrics.latestOutcome} />
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5 space-y-3">
              <div className="text-sm font-semibold">Executive digest</div>

              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center gap-2 text-sm text-black/70 dark:text-white/70">
                  <input
                    type="checkbox"
                    checked={digestConfig?.enabled ?? false}
                    onChange={(e) => {
                      saveDigestConfig({
                        enabled: e.target.checked,
                        recipients: digestConfig?.recipients || [],
                      });
                    }}
                    disabled={userRole !== "ADMIN"}
                    className="disabled:opacity-50"
                  />
                  Weekly org health digest
                </label>

                {digestConfig?.enabled ? (
                  <>
                    <div className="text-xs text-black/50 dark:text-white/50">Recipients</div>
                    <div className="flex flex-col gap-2">
                      {["EXECUTIVE", "HR", "MANAGER"].map((role) => {
                        const recipients = (digestConfig?.recipients || []) as any[];
                        const isSelected = recipients.some((r: any) => r.role === role);
                        return (
                          <label key={role} className="inline-flex items-center gap-2 text-sm text-black/70 dark:text-white/70">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const current = (digestConfig?.recipients || []) as any[];
                                const updated = e.target.checked
                                  ? [...current.filter((r: any) => r.role !== role), { role }]
                                  : current.filter((r: any) => r.role !== role);
                                saveDigestConfig({
                                  enabled: digestConfig?.enabled ?? false,
                                  recipients: updated,
                                });
                              }}
                              disabled={userRole !== "ADMIN"}
                              className="disabled:opacity-50"
                            />
                            {role}
                          </label>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={previewDigest}
                      disabled={userRole !== "ADMIN"}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-white/10 dark:bg-black"
                    >
                      Preview digest
                    </button>

                    {digestPreview ? (
                      <div className="mt-3">
                        <DigestPreview digest={digestPreview} />
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>

              <div className="text-xs text-black/50 dark:text-white/50">
                Weekly summary of org completeness and top actions. Email/Slack delivery coming soon.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

