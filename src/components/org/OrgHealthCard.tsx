// src/components/org/OrgHealthCard.tsx

"use client";

import { useOrgHealth } from "@/hooks/useOrgHealth";
import { computeRoleStructureRisk } from "@/lib/org/healthService";
import { useOpenLoopbrainForOrgHealth } from "@/lib/loopbrain/client-helpers";

export function OrgHealthCard() {
  const { data, isLoading, error } = useOrgHealth();
  const openLoopbrainForOrgHealth = useOpenLoopbrainForOrgHealth();

  if (isLoading) {
    return (
      <section className="rounded-lg border bg-card p-4">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </section>
    );
  }

  if (error || !data?.ok || !data.health) {
    return (
      <section className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
        <p className="text-xs text-destructive">
          Failed to load org health data.
        </p>
      </section>
    );
  }

  const health = data.health;
  const roleSummary = health.roles?.summary;

  // Calculate total role gaps
  const totalRoleGaps =
    (roleSummary?.rolesWithoutOwner || 0) +
    (roleSummary?.rolesWithoutResponsibilities || 0) +
    (roleSummary?.rolesWithoutTeam || 0) +
    (roleSummary?.rolesWithoutDepartment || 0);

  // Determine health color based on score
  const healthColor =
    health.score >= 80
      ? "text-emerald-600"
      : health.score >= 60
      ? "text-blue-600"
      : health.score >= 40
      ? "text-amber-600"
      : "text-red-600";

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Org Health</h2>
          <p className="text-xs text-muted-foreground">
            Overall organizational structure health.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <div className={`text-2xl font-bold ${healthColor}`}>
              {health.score}
            </div>
            <div className="text-xs text-muted-foreground">{health.label}</div>
            {totalRoleGaps > 0 && (
              <a
                href="#role-risks"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("role-risks")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="mt-1 inline-flex items-center rounded-full bg-amber-900/60 px-2 py-0.5 text-[10px] text-amber-100 hover:bg-amber-900/80 transition-colors"
              >
                Role gaps: {totalRoleGaps}
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              openLoopbrainForOrgHealth({
                initialQuestion:
                  "Explain our current org health score, the main structural risks (including roles), and the top 3 actions we should take.",
              })
            }
            className="inline-flex items-center gap-1 rounded-md border border-emerald-600 bg-emerald-900/30 px-2 py-1 text-[11px] font-medium text-emerald-100 hover:bg-emerald-900/60 transition-colors"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Ask Loopbrain to explain
          </button>
        </div>
      </div>

      {/* Org Structure */}
      <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-2 text-xs">
        <div>
          <div className="text-[11px] text-muted-foreground">Tree Depth</div>
          <div className="font-medium">{health.orgShape.depth}</div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">Centralized</div>
          <div className="font-medium">
            {health.orgShape.centralized ? "Yes" : "No"}
          </div>
        </div>
      </div>

      {/* Span of Control */}
      <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-2 text-xs">
        <div>
          <div className="text-[11px] text-muted-foreground">
            Overloaded Managers
          </div>
          <div className="font-medium">{health.spanOfControl.overloadedManagers}</div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">
            Underloaded Managers
          </div>
          <div className="font-medium">
            {health.spanOfControl.underloadedManagers}
          </div>
        </div>
      </div>

      {/* Team Balance */}
      <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-2 text-xs">
        <div>
          <div className="text-[11px] text-muted-foreground">
            Single-Person Teams
          </div>
          <div className="font-medium">{health.teamBalance.singlePointTeams}</div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">
            Largest Team Size
          </div>
          <div className="font-medium">{health.teamBalance.largestTeamSize}</div>
        </div>
      </div>

      {/* Role Structure Risk */}
      {roleSummary && (
        <div className="rounded-md border bg-muted/30 p-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Role structure</span>
            <span className="rounded bg-amber-900/80 px-2 py-0.5 font-mono text-amber-100">
              {(() => {
                const risk = computeRoleStructureRisk(health.roles);
                if (risk > 0.66) return "High risk";
                if (risk > 0.33) return "Medium";
                return "Low";
              })()}
            </span>
          </div>
        </div>
      )}

      {/* Role Risks */}
      {roleSummary && (
        <div className="mt-3 rounded-md border border-amber-800/60 bg-amber-950/40 p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-semibold text-amber-200 uppercase tracking-wide">
                Role Risks
              </p>
              <p className="text-[11px] text-amber-200/80">
                Gaps and inconsistencies in your role structure.
              </p>
            </div>
            <a
              href="#role-risks"
              className="text-[10px] text-amber-200/80 hover:text-amber-200 underline"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("role-risks")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              View details
            </a>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-amber-100">No owner</span>
              <span className="rounded bg-amber-900/80 px-2 py-0.5 font-mono">
                {roleSummary.rolesWithoutOwner}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-100">No responsibilities</span>
              <span className="rounded bg-amber-900/80 px-2 py-0.5 font-mono">
                {roleSummary.rolesWithoutResponsibilities}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-100">No team</span>
              <span className="rounded bg-amber-900/80 px-2 py-0.5 font-mono">
                {roleSummary.rolesWithoutTeam}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-100">No department</span>
              <span className="rounded bg-amber-900/80 px-2 py-0.5 font-mono">
                {roleSummary.rolesWithoutDepartment}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

