"use client";

/**
 * CapacityOverviewCard
 *
 * Dynamic capacity recommendations for the Overview page.
 * Replaces static "Enable capacity modeling" with real coverage/overload signals.
 *
 * Fetches from /api/org/capacity/summary.
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gauge, Users, AlertTriangle, ArrowDown, CheckCircle2, Loader2 } from "lucide-react";
import { useOrgUrl } from "@/hooks/useOrgUrl";
import { cn } from "@/lib/utils";

type CapacitySummary = {
  totalPeople: number;
  configuredCount: number;
  missingCount: number;
  overloadedPersonCount: number;
  underutilizedPersonCount: number;
  overloadedTeamCount: number;
  underutilizedTeamCount: number;
  teamIssueCount: number;
  totalIssueCount: number;
  coveragePct: number;
};

export function CapacityOverviewCard() {
  const orgUrl = useOrgUrl();
  const [summary, setSummary] = useState<CapacitySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/org/capacity/summary");
      if (!res.ok) {
        setSummary(null);
        return;
      }
      const data = await res.json();
      setSummary(data.summary);
      // Note: topIssues from capacity summary are intentionally ignored.
      // All issue surfacing comes from the canonical issues pipeline.
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading capacity...
        </CardContent>
      </Card>
    );
  }

  if (!summary || summary.totalPeople === 0) {
    return null; // Nothing to show
  }

  const hasIssues = summary.totalIssueCount > 0;
  const fullCoverage = summary.coveragePct === 100;
  const hasOverload = summary.overloadedPersonCount > 0 || summary.overloadedTeamCount > 0;

  return (
    <Card className={cn(
      "transition-colors",
      hasOverload && "border-l-4 border-l-orange-500",
      !hasOverload && !fullCoverage && summary.missingCount > 0 && "border-l-4 border-l-gray-500"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Capacity</CardTitle>
          </div>
          {fullCoverage && !hasIssues ? (
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Healthy
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              {summary.totalIssueCount} {summary.totalIssueCount === 1 ? "issue" : "issues"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Coverage status */}
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {fullCoverage ? (
            <span className="text-green-400">All {summary.totalPeople} people have capacity data</span>
          ) : (
            <span>
              <span className="font-medium">{summary.configuredCount}/{summary.totalPeople}</span>
              <span className="text-muted-foreground"> people configured ({summary.coveragePct}%)</span>
            </span>
          )}
        </div>

        {/* Dynamic recommendations */}
        <div className="space-y-1.5">
          {summary.missingCount > 0 && !fullCoverage && (
            <Link
              href={orgUrl.directory}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gray-400 shrink-0" />
              Set capacity for {summary.missingCount} {summary.missingCount === 1 ? "person" : "people"}
              <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">Go</span>
            </Link>
          )}

          {hasOverload && (
            <Link
              href={`${orgUrl.adminHealth}?types=CAPACITY_OVERLOADED_TEAM,CAPACITY_SEVERELY_OVERLOADED_TEAM,OVERALLOCATED_PERSON`}
              className="flex items-center gap-2 text-xs text-orange-400 hover:text-orange-300 transition-colors group"
            >
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {summary.overloadedTeamCount > 0 && (
                <span>{summary.overloadedTeamCount} overloaded {summary.overloadedTeamCount === 1 ? "team" : "teams"}</span>
              )}
              {summary.overloadedTeamCount > 0 && summary.overloadedPersonCount > 0 && <span>,</span>}
              {summary.overloadedPersonCount > 0 && (
                <span>{summary.overloadedPersonCount} overloaded {summary.overloadedPersonCount === 1 ? "person" : "people"}</span>
              )}
              <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">View</span>
            </Link>
          )}

          {summary.underutilizedTeamCount > 0 && (
            <Link
              href={`${orgUrl.adminHealth}?types=CAPACITY_UNDERUTILIZED_TEAM`}
              className="flex items-center gap-2 text-xs text-yellow-400 hover:text-yellow-300 transition-colors group"
            >
              <ArrowDown className="h-3 w-3 shrink-0" />
              {summary.underutilizedTeamCount} underutilized {summary.underutilizedTeamCount === 1 ? "team" : "teams"}
              <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">View</span>
            </Link>
          )}
        </div>

        {/* Issue surfacing removed — all issue display comes from the canonical issues pipeline.
           CapacityOverviewCard shows coverage metrics only. */}

        {/* Link to full view */}
        <div className="flex items-center gap-2 text-xs pt-1">
          <Link href={orgUrl.admin} className="text-primary hover:underline">
            View capacity intelligence
          </Link>
          {hasIssues && (
            <>
              <span className="text-muted-foreground">|</span>
              <Link
                href={`/org/admin/health?types=CAPACITY_MISSING_DATA_PERSON,CAPACITY_OVERLOADED_TEAM,CAPACITY_SEVERELY_OVERLOADED_TEAM,CAPACITY_UNDERUTILIZED_TEAM,CAPACITY_TEAM_NO_MEMBERS`}
                className="text-muted-foreground hover:text-primary hover:underline"
              >
                View issues
              </Link>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
