// src/app/(dashboard)/org/dev/org-debug/page.tsx

"use client";

import { useEffect, useState } from "react";
import type { OrgDebugSnapshot } from "@/types/loopbrain-org-debug";
import { OrgTelemetryCard } from "@/components/dev/OrgTelemetryCard";

function OrgSelfTestCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSelfTest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/org-self-test");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to run Org self-test");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8 rounded-lg border border-gray-700 bg-gray-900/40 p-4 space-y-3">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Org Integration Self-Test</h2>
          <p className="text-xs text-gray-400">
            Runs a quick backend check: workspace, Org bundle, and routing telemetry.
          </p>
        </div>
        <button
          onClick={runSelfTest}
          disabled={loading}
          className="rounded border border-gray-600 px-3 py-1 text-xs hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Running…" : "Run self-test"}
        </button>
      </header>

      {error && (
        <div className="rounded border border-red-500 bg-red-900/20 p-3 text-xs">
          <div className="font-semibold mb-1">Error</div>
          <div className="font-mono whitespace-pre-wrap">{error}</div>
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                result.ok
                  ? "bg-emerald-900/40 text-emerald-300 border border-emerald-700"
                  : "bg-red-900/40 text-red-300 border border-red-700"
              }`}
            >
              {result.ok ? "PASS" : "FAIL"}
            </span>
            {result.workspaceName && (
              <span className="text-xs text-gray-400">
                Workspace: {result.workspaceName}
              </span>
            )}
          </div>
          {result.orgBundle && (
            <div className="rounded border border-gray-700 bg-black/40 p-2 text-xs">
              <div className="font-semibold mb-1">Org Bundle</div>
              <div className="flex items-center gap-2">
                <span
                  className={
                    result.orgBundle.ok
                      ? "text-emerald-300"
                      : "text-red-300"
                  }
                >
                  {result.orgBundle.ok ? "✓" : "✗"}
                </span>
                <span>
                  {result.orgBundle.ok
                    ? `Built successfully (${result.orgBundle.nodeCount} nodes)`
                    : `Failed: ${result.orgBundle.error || "Unknown error"}`}
                </span>
              </div>
            </div>
          )}
          {result.routingStats && (
            <div className="rounded border border-gray-700 bg-black/40 p-2 text-xs">
              <div className="font-semibold mb-1">Routing Stats</div>
              <div className="space-y-1">
                <div>
                  Total: {result.routingStats.total} • Org:{" "}
                  {result.routingStats.org} • Generic:{" "}
                  {result.routingStats.generic}
                </div>
              </div>
            </div>
          )}
          <pre className="mt-2 max-h-64 overflow-auto rounded bg-black/60 p-3 text-xs font-mono whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {!result && !error && !loading && (
        <p className="text-xs text-gray-500">
          Click "Run self-test" to see Org → Loopbrain integration status.
        </p>
      )}
    </section>
  );
}

type ApiResponse = {
  ok: boolean;
  snapshot: OrgDebugSnapshot | null;
};

export default function OrgDebugPage() {
  const [snapshot, setSnapshot] = useState<OrgDebugSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadSnapshot() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/org-debug");

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with ${res.status}`);
      }

      const data: ApiResponse = await res.json();

      setSnapshot(data.snapshot ?? null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load Org debug snapshot");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSnapshot();
    const id = setInterval(loadSnapshot, 5000); // poll every 5s
    return () => clearInterval(id);
  }, []);

  return (
    <main className="min-h-screen bg-black text-gray-50 p-6">
      <h1 className="text-2xl font-semibold mb-4">
        Org Mode – Loopbrain Debug
      </h1>

      <p className="text-sm text-gray-400 mb-4">
        Dev-only panel. Shows how the orchestrator routed the{" "}
        <span className="font-mono">last</span> question.
      </p>

      <button
        onClick={loadSnapshot}
        disabled={loading}
        className="mb-4 rounded border border-gray-600 px-3 py-1 text-sm hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Refreshing…" : "Refresh now"}
      </button>

      {error && (
        <div className="mb-4 rounded border border-red-500 bg-red-900/20 p-3 text-sm">
          <div className="font-semibold">Error</div>
          <div className="font-mono text-xs">{error}</div>
        </div>
      )}

      {!snapshot && !error && (
        <div className="text-sm text-gray-400">
          No snapshot yet. Ask a question through Loopbrain to populate this
          view.
        </div>
      )}

      {snapshot && (
        <div className="space-y-4">
          <section className="rounded border border-gray-700 bg-gray-900/40 p-4">
            <h2 className="text-lg font-semibold mb-2">Routing</h2>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-400">Mode</dt>
                <dd className="font-mono">{snapshot.mode}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-400">wantsOrg</dt>
                <dd className="font-mono">{String(snapshot.wantsOrg)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-400">hasOrgContext</dt>
                <dd className="font-mono">
                  {String(snapshot.hasOrgContext)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-400">workspaceId</dt>
                <dd className="font-mono">
                  {snapshot.workspaceId || "<none>"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-400">timestamp</dt>
                <dd className="font-mono">{snapshot.timestamp}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-400">context length</dt>
                <dd className="font-mono">
                  {snapshot.orgContextLength ?? 0}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded border border-gray-700 bg-gray-900/40 p-4">
            <h2 className="text-lg font-semibold mb-2">Question</h2>
            <pre className="max-h-40 overflow-auto rounded bg-black/60 p-3 text-xs font-mono whitespace-pre-wrap">
              {snapshot.question}
            </pre>
          </section>

          <section className="rounded border border-gray-700 bg-gray-900/40 p-4">
            <h2 className="text-lg font-semibold mb-2">Org context preview</h2>
            {snapshot.orgContextPreview ? (
              <pre className="max-h-64 overflow-auto rounded bg-black/60 p-3 text-xs font-mono whitespace-pre-wrap">
                {snapshot.orgContextPreview}
              </pre>
            ) : (
              <div className="text-sm text-gray-400">
                No Org context captured for this question.
              </div>
            )}
          </section>

          {snapshot.error && (
            <section className="rounded border border-red-700 bg-red-900/30 p-4">
              <h2 className="text-lg font-semibold mb-2">Context error</h2>
              <pre className="whitespace-pre-wrap text-xs font-mono">
                {snapshot.error}
              </pre>
            </section>
          )}
        </div>
      )}

      {/* Org Routing Telemetry Card */}
      <div className="mt-8">
        <OrgTelemetryCard />
      </div>

      {/* Org Integration Self-Test */}
      <OrgSelfTestCard />

      {/* Org Role Graph Debug */}
      <OrgRolesDebugSection />
    </main>
  );
}

type DevRoleRow = {
  id: string;
  title: string;
  ownerId: string | null;
  ownerPersonId: string | null;
  teamId: string | null;
  departmentId: string | null;
  responsibilitiesCount: number;
  status: string;
  updatedAt: string;
};

type DevRoleValidationIssue = {
  roleId: string;
  roleTitle: string;
  type: string;
  message: string;
};

type DevRoleDebugResponse = {
  ok: boolean;
  roles: DevRoleRow[];
  validation: {
    rolesAnalyzed: number;
    issues: DevRoleValidationIssue[];
  };
};

function OrgRolesDebugSection() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DevRoleDebugResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadRoles() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/org/roles");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with ${res.status}`);
      }
      const json = (await res.json()) as DevRoleDebugResponse;
      setData(json);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load Org roles debug data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoles().catch(() => undefined);
  }, []);

  const roles = data?.roles ?? [];
  const validation = data?.validation;

  return (
    <section className="mt-8 rounded-lg border border-gray-700 bg-gray-900/40 p-4 space-y-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Org Role Graph (Debug)</h2>
          <p className="text-xs text-gray-400">
            Live view of role ContextItems: owners, teams, departments,
            responsibilities, and validation warnings.
          </p>
        </div>
        <button
          onClick={loadRoles}
          disabled={loading}
          className="rounded border border-gray-600 px-3 py-1 text-xs hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="rounded border border-red-500 bg-red-900/20 p-3 text-xs">
          <div className="font-semibold mb-1">Error</div>
          <div className="font-mono whitespace-pre-wrap">{error}</div>
        </div>
      )}

      {validation && (
        <div className="rounded border border-gray-700 bg-black/40 p-3 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Validation Summary</span>
            <span className="text-gray-400">
              Roles analyzed: {validation.rolesAnalyzed} · Issues:{" "}
              {validation.issues.length}
            </span>
          </div>
          {validation.issues.length === 0 ? (
            <p className="text-green-400">No issues detected in role graph.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {validation.issues.slice(0, 10).map((issue) => (
                <li
                  key={`${issue.roleId}-${issue.type}`}
                  className="flex gap-2"
                >
                  <span className="rounded bg-yellow-900/60 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                    {issue.type}
                  </span>
                  <span className="text-gray-200">
                    <span className="font-semibold">{issue.roleTitle}</span>{" "}
                    <span className="text-gray-400">({issue.roleId})</span>:{" "}
                    {issue.message}
                  </span>
                </li>
              ))}
              {validation.issues.length > 10 && (
                <li className="text-[11px] text-gray-500">
                  + {validation.issues.length - 10} more…
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      <div className="rounded border border-gray-800 bg-black/20 p-3">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold">Roles</span>
          <span className="text-gray-400">
            Showing {roles.length} role ContextItems
          </span>
        </div>
        {roles.length === 0 ? (
          <p className="text-xs text-gray-500">
            No role ContextItems found. Create Org Positions and/or Role Cards
            to populate roles.
          </p>
        ) : (
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-900/60 sticky top-0 z-10">
                <tr className="text-left">
                  <th className="px-2 py-1">Title</th>
                  <th className="px-2 py-1">Owner</th>
                  <th className="px-2 py-1">Team</th>
                  <th className="px-2 py-1">Department</th>
                  <th className="px-2 py-1 text-right">Resp.</th>
                  <th className="px-2 py-1">Status</th>
                  <th className="px-2 py-1">Updated</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r.id} className="border-t border-gray-800">
                    <td className="px-2 py-1">
                      <div className="font-semibold text-gray-100">
                        {r.title}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono truncate">
                        {r.id}
                      </div>
                    </td>
                    <td className="px-2 py-1">
                      <div className="text-[10px] text-gray-300 font-mono truncate">
                        {r.ownerId ?? "—"}
                      </div>
                    </td>
                    <td className="px-2 py-1">
                      <div className="text-[10px] text-gray-300 font-mono truncate">
                        {r.teamId ?? "—"}
                      </div>
                    </td>
                    <td className="px-2 py-1">
                      <div className="text-[10px] text-gray-300 font-mono truncate">
                        {r.departmentId ?? "—"}
                      </div>
                    </td>
                    <td className="px-2 py-1 text-right">
                      <span className="inline-flex items-center justify-center rounded bg-gray-800 px-2 py-0.5 text-[10px]">
                        {r.responsibilitiesCount}
                      </span>
                    </td>
                    <td className="px-2 py-1">
                      <span className="inline-flex items-center rounded bg-gray-800 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                        {r.status ?? "ACTIVE"}
                      </span>
                    </td>
                    <td className="px-2 py-1">
                      <div className="text-[10px] text-gray-500 truncate">
                        {new Date(r.updatedAt).toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

