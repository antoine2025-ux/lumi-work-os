import Link from "next/link";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { isOrgCenterEnabled, isOrgCenterBeta } from "@/lib/org/feature-flags";

export default async function OrgDevSmokePage() {
  const context = await getOrgPermissionContext();

  if (!process.env.NODE_ENV || process.env.NODE_ENV === "production") {
    return (
      <div className="px-10 pt-10 text-[13px] text-slate-400">
        Org dev smoke page is only available in non-production environments.
      </div>
    );
  }

  return (
    <div className="px-10 pt-8 pb-10 text-[13px] text-slate-200">
      <div className="mb-4">
        <h1 className="text-[16px] font-semibold text-slate-50">
          Org Center – Dev Smoke Test
        </h1>
        <p className="mt-1 text-[11px] text-slate-500">
          Quick links and checks to validate core Org Center flows before demos or deployments.
        </p>
      </div>

      <div className="mb-4 rounded-2xl border border-slate-800 bg-[#020617] px-4 py-3 text-[12px]">
        <div className="mb-1 font-medium text-slate-100">Environment & flags</div>
        <ul className="list-disc pl-4 text-[11px] text-slate-400 space-y-1">
          <li>Org Center enabled: {isOrgCenterEnabled() ? "yes" : "no"}</li>
          <li>Org Center beta: {isOrgCenterBeta() ? "yes" : "no"}</li>
          <li>Current role: {context?.role ?? "none"}</li>
          <li>Has custom role: {context?.customRole ? "yes" : "no"}</li>
          <li>Org ID: {context?.orgId ?? "none"}</li>
        </ul>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-[#020617] px-4 py-3 text-[12px]">
          <div className="mb-1 font-medium text-slate-100">Core pages</div>
          <ul className="list-disc pl-4 text-[11px] text-slate-400 space-y-1">
            <li>
              <Link href="/org" className="text-sky-400 hover:underline">
                Org overview
              </Link>
            </li>
            <li>
              <Link href="/org/people" className="text-sky-400 hover:underline">
                People
              </Link>
            </li>
            <li>
              <Link href="/org/structure" className="text-sky-400 hover:underline">
                Structure
              </Link>
            </li>
            <li>
              <Link href="/org/chart" className="text-sky-400 hover:underline">
                Org chart
              </Link>
            </li>
            <li>
              <Link href="/org/insights" className="text-sky-400 hover:underline">
                Insights
              </Link>
            </li>
            <li>
              <Link href="/org/activity" className="text-sky-400 hover:underline">
                Activity
              </Link>
            </li>
            <li>
              <Link href="/org/settings" className="text-sky-400 hover:underline">
                Settings
              </Link>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#020617] px-4 py-3 text-[12px]">
          <div className="mb-1 font-medium text-slate-100">Quick API checks</div>
          <ul className="list-disc pl-4 text-[11px] text-slate-400 space-y-1">
            <li>
              <Link href="/api/org/health" className="text-sky-400 hover:underline">
                /api/org/health
              </Link>{" "}
              (200 + context)
            </li>
            <li>
              <Link href="/api/org/current" className="text-sky-400 hover:underline">
                /api/org/current
              </Link>{" "}
              (200 + org data)
            </li>
            <li>
              <Link href="/api/org/custom-roles" className="text-sky-400 hover:underline">
                /api/org/custom-roles
              </Link>{" "}
              (200 for Owner, 403 for Member)
            </li>
            <li>
              <Link href="/api/org/insights" className="text-sky-400 hover:underline">
                /api/org/insights
              </Link>{" "}
              (200 for Owner/Admin, 403 for Member)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

