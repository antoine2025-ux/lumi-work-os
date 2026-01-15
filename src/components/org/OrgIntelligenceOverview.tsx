"use client";

import Link from "next/link";
import { OrgApi, type SnapshotFreshness } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge } from "@/components/org/SeverityBadge";
import { OrgSectionLoading, OrgSectionError, OrgSectionEmpty } from "@/components/org/OrgSectionState";

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

export function OrgIntelligenceOverview() {
  // Fire both queries in parallel (not sequential)
  const latestQ = useOrgQuery(() => OrgApi.getLatestIntelligenceSnapshot(), []);
  const recommendationsQ = useOrgQuery(() => OrgApi.getLatestRecommendations(), []);

  const loading = latestQ.loading || recommendationsQ.loading;
  const error = latestQ.error || recommendationsQ.error;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Intelligence</CardTitle>
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
          <CardTitle className="text-sm font-medium text-slate-100">Intelligence</CardTitle>
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
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-100">Intelligence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-400">
            Intelligence insights are coming soon. This feature will provide organizational recommendations and findings.
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

  function formatAge(minutes: number | null): string {
    if (minutes === null) return "";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  function freshnessBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "FRESH": return "default";
      case "STALE": return "secondary";
      case "OUTDATED": return "destructive";
      case "MISSING": return "outline";
      default: return "outline";
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Intelligence</CardTitle>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/org/intelligence/drilldowns">Drilldowns</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href="/org/intelligence">View all</Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            Snapshot: {new Date(snapshot.createdAt).toLocaleString()} • Findings:{" "}
            {snapshot.findingCount}
          </div>
          {freshness && (
            <div className="flex items-center gap-2">
              <Badge variant={freshnessBadgeVariant(freshness.status)}>
                {freshness.status}
              </Badge>
              {freshness.ageMinutes !== null && (
                <span className="text-xs text-muted-foreground">
                  Age: {formatAge(freshness.ageMinutes)}
                </span>
              )}
            </div>
          )}
        </div>
        {freshness && freshness.status === "STALE" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-muted-foreground">
            Snapshot is outdated. Generate a new snapshot for up-to-date insights.
          </div>
        )}
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
            <Button asChild size="sm" variant="secondary" className="mt-2">
              <Link href="/org/intelligence">View all actions</Link>
            </Button>
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

