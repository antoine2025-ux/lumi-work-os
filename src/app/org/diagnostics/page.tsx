/**
 * Org Center Diagnostics Page
 * 
 * Internal-only diagnostics page for monitoring Org Center health and performance.
 * Shows current context, observability guidelines, and links to logs.
 * 
 * This page is only accessible to authenticated users with org access.
 */

import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgPageViewTracker } from "@/components/org/telemetry/OrgPageViewTracker";

export default async function OrgDiagnosticsPage() {
  const context = await getOrgPermissionContext();

  if (!context) {
    return (
      <div className="px-10 pt-10">
        <div className="max-w-lg rounded-2xl border border-slate-800 bg-[#020617] px-6 py-6 text-[13px] text-slate-200">
          <div className="text-[15px] font-semibold text-slate-100">
            Not authenticated
          </div>
          <p className="mt-2 text-[12px] text-slate-500">
            You need to be signed in to view diagnostics.
          </p>
        </div>
      </div>
    );
  }

  const { orgId, userId, role } = context;

  return (
    <div className="px-10 pt-8 pb-10">
      <OrgPageViewTracker route="/org/diagnostics" name="Org Diagnostics" />
      <OrgPageHeader
        breadcrumb={[
          { label: "ORG", href: "/org" },
          { label: "DIAGNOSTICS" }
        ]}
        title="Org Center Diagnostics"
        description="Internal diagnostics and observability information for Org Center."
      />

      <div className="mt-6 space-y-6">
        {/* Current Context */}
        <section className="rounded-2xl border border-slate-800 bg-[#020617] p-6">
          <h2 className="text-sm font-semibold text-slate-100 mb-4">
            Current Context
          </h2>
          <div className="space-y-2 text-[12px] text-slate-300">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 w-24">Org ID:</span>
              <code className="text-[11px] bg-slate-900 px-2 py-1 rounded">
                {orgId}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 w-24">User ID:</span>
              <code className="text-[11px] bg-slate-900 px-2 py-1 rounded">
                {userId}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 w-24">Role:</span>
              <span className="text-slate-200">{role}</span>
            </div>
          </div>
        </section>

        {/* Observability Guidelines */}
        <section className="rounded-2xl border border-slate-800 bg-[#020617] p-6">
          <h2 className="text-sm font-semibold text-slate-100 mb-4">
            Observability Guidelines
          </h2>
          <div className="space-y-4 text-[12px] text-slate-300">
            <div>
              <h3 className="text-[13px] font-medium text-slate-200 mb-2">
                Performance Monitoring
              </h3>
              <ul className="list-disc list-inside space-y-1 text-slate-400 ml-2">
                <li>
                  Check logs for <code className="text-[11px] bg-slate-900 px-1 rounded">loader_timing</code> events
                </li>
                <li>
                  Look for loaders taking <strong className="text-slate-300">&gt;200ms</strong> (may indicate performance issues)
                </li>
                <li>
                  Monitor <code className="text-[11px] bg-slate-900 px-1 rounded">api_error</code> and <code className="text-[11px] bg-slate-900 px-1 rounded">loader_error</code> events
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-[13px] font-medium text-slate-200 mb-2">
                Log Structure
              </h3>
              <p className="text-slate-400 mb-2">
                All Org Center logs are structured as JSON with the following fields:
              </p>
              <pre className="text-[11px] bg-slate-900 p-3 rounded overflow-x-auto">
{`{
  "scope": "org_center",
  "level": "info" | "warn" | "error",
  "event": "loader_timing" | "api_success" | "api_error" | ...,
  "loader"?: "getOrgPeople" | "getOrgStructureLists" | ...,
  "route"?: "/api/org/insights/overview" | ...,
  "orgId"?: string,
  "userId"?: string,
  "durationMs"?: number,
  "meta"?: { ... }
}`}
              </pre>
            </div>

            <div>
              <h3 className="text-[13px] font-medium text-slate-200 mb-2">
                Where to Find Logs
              </h3>
              <ul className="list-disc list-inside space-y-1 text-slate-400 ml-2">
                <li>
                  <strong>Development:</strong> Check the terminal where Next.js is running
                </li>
                <li>
                  <strong>Staging/Production:</strong> Check your log aggregation service (e.g., Vercel logs, CloudWatch, Datadog)
                </li>
                <li>
                  Filter logs by <code className="text-[11px] bg-slate-900 px-1 rounded">scope: &quot;org_center&quot;</code>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-[13px] font-medium text-slate-200 mb-2">
                Key Loaders Being Monitored
              </h3>
              <ul className="list-disc list-inside space-y-1 text-slate-400 ml-2">
                <li><code className="text-[11px] bg-slate-900 px-1 rounded">getOrgOverviewStats</code></li>
                <li><code className="text-[11px] bg-slate-900 px-1 rounded">getOrgPeople</code></li>
                <li><code className="text-[11px] bg-slate-900 px-1 rounded">getOrgStructureLists</code></li>
                <li><code className="text-[11px] bg-slate-900 px-1 rounded">getOrgInsights</code></li>
                <li><code className="text-[11px] bg-slate-900 px-1 rounded">getOrgAdminActivity</code></li>
              </ul>
            </div>

            <div>
              <h3 className="text-[13px] font-medium text-slate-200 mb-2">
                Key API Routes Being Monitored
              </h3>
              <ul className="list-disc list-inside space-y-1 text-slate-400 ml-2">
                <li><code className="text-[11px] bg-slate-900 px-1 rounded">/api/org/insights/overview</code></li>
                <li><code className="text-[11px] bg-slate-900 px-1 rounded">/api/org/activity</code></li>
              </ul>
            </div>
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="rounded-2xl border border-slate-800 bg-[#020617] p-6">
          <h2 className="text-sm font-semibold text-slate-100 mb-4">
            Troubleshooting
          </h2>
          <div className="space-y-3 text-[12px] text-slate-300">
            <div>
              <h3 className="text-[13px] font-medium text-slate-200 mb-1">
                If pages feel slow:
              </h3>
              <p className="text-slate-400">
                Check logs for <code className="text-[11px] bg-slate-900 px-1 rounded">loader_timing</code> events with <code className="text-[11px] bg-slate-900 px-1 rounded">durationMs &gt; 200</code>. This may indicate:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4 mt-1">
                <li>Database query performance issues</li>
                <li>Missing indexes (check Prisma schema)</li>
                <li>Large data volumes requiring pagination</li>
                <li>Network latency issues</li>
              </ul>
            </div>

            <div>
              <h3 className="text-[13px] font-medium text-slate-200 mb-1">
                If you see errors:
              </h3>
              <p className="text-slate-400">
                Look for <code className="text-[11px] bg-slate-900 px-1 rounded">api_error</code> or <code className="text-[11px] bg-slate-900 px-1 rounded">loader_error</code> events. Check the <code className="text-[11px] bg-slate-900 px-1 rounded">meta.message</code> field for details.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
