"use client";

import { useSearchParams } from "next/navigation";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { useCurrentOrgRole } from "@/hooks/useCurrentOrgRole";
import { useOrgOverviewStats } from "@/hooks/useOrgOverviewStats";
import { useOrgChartData } from "@/hooks/useOrgChartData";

export function OrgDebugPanel() {
  const searchParams = useSearchParams();
  const debugFlag = searchParams.get("debugOrg");

  const debugEnabled =
    debugFlag === "1" ||
    debugFlag === "true" ||
    debugFlag === "yes" ||
    debugFlag === "debug";

  const { org, isLoading: isOrgLoading } = useCurrentOrg();
  const { role, source: roleSource } = useCurrentOrgRole();
  const { stats, isLoading: isStatsLoading, error: statsError } = useOrgOverviewStats();
  const { data: chartData, isLoading: isChartLoading, error: chartError } = useOrgChartData();

  if (!debugEnabled) {
    return null;
  }

  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-40 w-[360px] max-w-full rounded-2xl border border-amber-400/40 bg-black/90 p-3 text-[11px] text-amber-100 shadow-2xl">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300">
          Org debug
        </div>
        <div className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200">
          debugOrg={String(debugFlag)}
        </div>
      </div>

      <div className="space-y-2 overflow-y-auto max-h-[50vh]">
        <section>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-300">
            Current org
          </div>
          {isOrgLoading && <div className="text-[10px] text-amber-200">Loading org…</div>}
          {!isOrgLoading && !org && (
            <div className="text-[10px] text-red-300">No org resolved.</div>
          )}
          {org && (
            <>
              <pre className="max-h-24 overflow-auto rounded bg-black/40 p-2 text-[10px] leading-snug">
                {JSON.stringify(org, null, 2)}
              </pre>
              <div className="mt-1 text-[10px] text-amber-200">
                Role: <span className="font-mono">{role}</span>{" "}
                <span className="text-amber-400/80">({roleSource})</span>
              </div>
            </>
          )}
        </section>

        <section>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-300">
            Overview stats
          </div>
          {isStatsLoading && (
            <div className="text-[10px] text-amber-200">Loading stats…</div>
          )}
          {statsError && (
            <div className="text-[10px] text-red-300">
              Error: {statsError}
            </div>
          )}
          {stats && (
            <pre className="max-h-24 overflow-auto rounded bg-black/40 p-2 text-[10px] leading-snug">
              {JSON.stringify(stats, null, 2)}
            </pre>
          )}
        </section>

        <section>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-300">
            Org chart data
          </div>
          {isChartLoading && (
            <div className="text-[10px] text-amber-200">Loading chart…</div>
          )}
          {chartError && (
            <div className="text-[10px] text-red-300">
              Error: {chartError}
            </div>
          )}
          {chartData && (
            <pre className="max-h-32 overflow-auto rounded bg-black/40 p-2 text-[10px] leading-snug">
              {JSON.stringify(chartData, null, 2)}
            </pre>
          )}
        </section>
      </div>

      <div className="mt-2 border-t border-amber-500/20 pt-1 text-[9px] text-amber-300/80">
        Shown only when <span className="font-mono">?debugOrg=1</span> (or true/yes/debug).
      </div>
    </div>
  );
}

