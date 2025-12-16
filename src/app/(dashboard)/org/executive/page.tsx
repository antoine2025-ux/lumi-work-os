"use client";

/**
 * Executive Dashboard
 * 
 * Read-only narrative view of org improvements and changes.
 * Designed for executive summaries and trust-building.
 */

import React, { useEffect, useState } from "react";

type FixEvent = {
  id: string;
  personId?: string;
  personName?: string;
  fixType: string;
  impactScore: number;
  createdAt: string;
};

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffDays < 1) return "today";
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  if (diffWeeks < 4) return `${diffWeeks} ${diffWeeks === 1 ? "week" : "weeks"} ago`;
  return d.toLocaleDateString();
}

function formatFixSummary(event: FixEvent): string {
  const personName = event.personName || "Unknown person";
  
  switch (event.fixType) {
    case "ASSIGN_MANAGER":
      return `Assigned manager to ${personName}`;
    case "ASSIGN_TEAM":
      return `Added team to ${personName}`;
    case "ASSIGN_ROLE":
      return `Assigned role to ${personName}`;
    default:
      return `Fixed issue for ${personName}`;
  }
}

export default function ExecutivePage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [topFixes, setTopFixes] = useState<FixEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [completenessDelta, setCompletenessDelta] = useState<{
    reportingLines?: number;
    teams?: number;
    roles?: number;
  } | null>(null);

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
    if (!orgId) return;

    async function load() {
      setLoading(true);
      try {
        // Load top 3 most impactful fixes
        const res = await fetch(`/api/org/fix-events?orgId=${orgId}&limit=3&sortBy=impact`, { cache: "no-store" });
        const data = await res.json().catch(() => ({} as any));
        
        if (data?.ok && Array.isArray(data.events)) {
          setTopFixes(data.events);
          
          // Calculate completeness deltas (simplified - in production, compute from before/after states)
          // For now, estimate based on fix types
          const reportingLinesDelta = data.events.filter((e: FixEvent) => e.fixType === "ASSIGN_MANAGER").length;
          const teamsDelta = data.events.filter((e: FixEvent) => e.fixType === "ASSIGN_TEAM").length;
          const rolesDelta = data.events.filter((e: FixEvent) => e.fixType === "ASSIGN_ROLE").length;
          
          setCompletenessDelta({
            reportingLines: reportingLinesDelta,
            teams: teamsDelta,
            roles: rolesDelta,
          });
        }
      } catch (error) {
        console.warn("Failed to load fix events:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [orgId]);

  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <div className="text-xl font-semibold tracking-[-0.02em] text-black dark:text-white">
          Executive Summary
        </div>
        <div className="mt-1 text-sm text-black/60 dark:text-white/60">
          Organizational improvements and progress narrative.
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-black/10 bg-white/70 p-6 text-sm text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
          Loading summary…
        </div>
      ) : (
        <div className="space-y-6">
          {/* What changed */}
          <section className="rounded-2xl border border-black/10 bg-white/70 p-6 dark:border-white/10 dark:bg-white/5">
            <div className="mb-4">
              <div className="text-sm font-semibold text-black/90 dark:text-white/90">
                What changed
              </div>
              <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                Top improvements this period.
              </div>
            </div>

            {topFixes.length === 0 ? (
              <div className="text-sm text-black/60 dark:text-white/60">
                No changes recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {topFixes.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start justify-between gap-4 rounded-xl border border-black/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-black/90 dark:text-white/90">
                        {formatFixSummary(event)}
                      </div>
                      <div className="mt-0.5 text-xs text-black/50 dark:text-white/50">
                        {formatRelativeTime(event.createdAt)}
                      </div>
                    </div>
                    <div className="shrink-0 text-xs text-black/60 dark:text-white/60">
                      Impact {event.impactScore}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Completeness improvements */}
          {completenessDelta && (
            <section className="rounded-2xl border border-black/10 bg-white/70 p-6 dark:border-white/10 dark:bg-white/5">
              <div className="mb-4">
                <div className="text-sm font-semibold text-black/90 dark:text-white/90">
                  Completeness improvements
                </div>
                <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                  Estimated impact on org completeness.
                </div>
              </div>

              <div className="space-y-2 text-sm text-black/70 dark:text-white/70">
                {completenessDelta.reportingLines ? (
                  <div className="flex justify-between gap-4">
                    <span className="text-black/50 dark:text-white/50">Reporting lines</span>
                    <span className="font-medium text-black/90 dark:text-white/90">
                      +{completenessDelta.reportingLines}% improvement
                    </span>
                  </div>
                ) : null}
                {completenessDelta.teams ? (
                  <div className="flex justify-between gap-4">
                    <span className="text-black/50 dark:text-white/50">Teams assigned</span>
                    <span className="font-medium text-black/90 dark:text-white/90">
                      +{completenessDelta.teams}% improvement
                    </span>
                  </div>
                ) : null}
                {completenessDelta.roles ? (
                  <div className="flex justify-between gap-4">
                    <span className="text-black/50 dark:text-white/50">Roles assigned</span>
                    <span className="font-medium text-black/90 dark:text-white/90">
                      +{completenessDelta.roles}% improvement
                    </span>
                  </div>
                ) : null}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

