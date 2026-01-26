"use client";

import { useState } from "react";
import Link from "next/link";
import { OrgApi, type SnapshotFreshness } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/org/SeverityBadge";
import { cn } from "@/lib/utils";

function linkForFinding(f: { entityType: string; entityId: string | null }) {
  if (f.entityType === "PERSON" && f.entityId) return `/org/people/${f.entityId}`;
  if ((f.entityType === "TEAM" || f.entityType === "DEPARTMENT") && f.entityId)
    return "/org/structure";
  return "/org";
}

function fixRouteForSignal(signal: string) {
  if (signal === "OWNERSHIP_RISK") return "/org/ownership";
  if (signal === "MANAGEMENT_LOAD") return "/org/people";
  if (signal === "STRUCTURAL_GAP") return "/org/people";
  return "/org";
}

// Status indicator component
function FreshnessStatus({ freshness }: { freshness: SnapshotFreshness }) {
  const formatAge = (minutes: number | null): string => {
    if (minutes === null) return "";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const isOutdated = freshness.status === "OUTDATED" || freshness.status === "STALE";
  const isFresh = freshness.status === "FRESH";

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
          isFresh && "bg-green-500/10 text-green-400",
          isOutdated && "bg-amber-500/10 text-amber-400",
          !isFresh && !isOutdated && "bg-slate-500/10 text-slate-400"
        )}
      >
        <div
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            isFresh && "bg-green-400",
            isOutdated && "bg-amber-400",
            !isFresh && !isOutdated && "bg-slate-400"
          )}
        />
        {isFresh ? "Up to date" : isOutdated ? `Outdated (${formatAge(freshness.ageMinutes)})` : freshness.status}
      </div>
    </div>
  );
}

export function OrgIntelligenceOverview() {
  const [isGenerating, setIsGenerating] = useState(false);

  // Fire both queries in parallel (not sequential)
  const latestQ = useOrgQuery(() => OrgApi.getLatestIntelligenceSnapshot(), []);
  const recommendationsQ = useOrgQuery(() => OrgApi.getLatestRecommendations(), []);

  const loading = latestQ.loading || recommendationsQ.loading;
  const error = latestQ.error || recommendationsQ.error;

  const handleGenerateSnapshot = async () => {
    setIsGenerating(true);
    try {
      await OrgApi.createIntelligenceSnapshot();
      // Refetch queries after generation
      await Promise.all([latestQ.refetch?.(), recommendationsQ.refetch?.()]);
    } catch (err) {
      console.error("Failed to generate snapshot:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-100">Intelligence snapshot</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Loading insights…</CardContent>
      </Card>
    );
  }

  // Gracefully handle errors - never show red errors, just show "Coming soon"
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-100">Intelligence snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-400">
            Intelligence insights are coming soon. This does not affect Org setup or core functionality.
          </div>
        </CardContent>
      </Card>
    );
  }

  const snapshot = latestQ.data?.snapshot;
  const freshness = latestQ.data?.freshness;
  const recommendations = recommendationsQ.data?.recommendations;

  // Show "Coming soon" when no snapshot or data is unreliable
  if (!snapshot || !freshness || freshness.status === "MISSING") {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-100">Intelligence snapshot</CardTitle>
          <Button
            size="sm"
            disabled={isGenerating}
            onClick={handleGenerateSnapshot}
          >
            {isGenerating ? "Generating..." : "Generate snapshot"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-400">
            Intelligence insights are coming soon. Generate a snapshot to see organizational recommendations and findings.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prioritize: HIGH first, then MEDIUM, then LOW
  const findings = [...snapshot.findings].sort((a, b) => {
    const rank = (s: string) => (s === "HIGH" ? 3 : s === "MEDIUM" ? 2 : 1);
    return rank(b.severity) - rank(a.severity);
  });

  const top = findings.slice(0, 6);

  const isOutdated = freshness.status === "OUTDATED" || freshness.status === "STALE";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <CardTitle className="text-sm font-medium text-slate-100">Intelligence snapshot</CardTitle>
          <FreshnessStatus freshness={freshness} />
        </div>
        {/* Single contextual primary action */}
        {isOutdated ? (
          <Button
            size="sm"
            disabled={isGenerating}
            onClick={handleGenerateSnapshot}
          >
            {isGenerating ? "Generating..." : "Generate snapshot"}
          </Button>
        ) : (
          <Button asChild size="sm" variant="secondary">
            <Link href="/org/intelligence">View intelligence</Link>
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Inline helper when outdated (replaces bright yellow banner) */}
        {isOutdated && (
          <div className="text-xs text-slate-500">
            Snapshot is outdated. Generate a new snapshot for current insights.
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Last updated: {new Date(snapshot.createdAt).toLocaleString()} • {snapshot.findingCount} findings
        </div>

        {recommendations && recommendations.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium">
              Top actions: {recommendations.length}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              {recommendations.slice(0, 2).map((rec) => (
                <div key={rec.id}>• {rec.title}</div>
              ))}
            </div>
          </div>
        )}

        {top.length === 0 ? (
          <div className="text-sm text-muted-foreground">No findings right now.</div>
        ) : (
          <div className="space-y-2">
            {top.map((f, idx) => (
              <div
                key={`${f.signal}-${f.entityId}-${idx}`}
                className="flex items-start justify-between gap-3 rounded-lg border p-3"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{f.title}</div>
                    <SeverityBadge severity={f.severity} />
                  </div>
                  <div className="text-sm text-muted-foreground">{f.explanation}</div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="secondary">
                      <Link href={linkForFinding(f)}>Open</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href={fixRouteForSignal(f.signal)}>Fix</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
