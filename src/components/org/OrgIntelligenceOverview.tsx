/**
 * OrgIntelligenceOverview – Live Attention Section
 *
 * Replaced snapshot-based findings with canonical issue-driven data.
 * Sources from /api/org/issues/summary (via useOrgIssuesSummary).
 *
 * Must NOT call snapshots, /api/org/reasoning, or any other
 * non-canonical source.
 */

"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useOrgIssuesSummary } from "@/hooks/useOrgIssuesSummary";
import { useOrgUrl } from "@/hooks/useOrgUrl";
import { IssueAttentionRow } from "@/components/org/issues/IssueAttentionRow";

export function OrgIntelligenceOverview() {
  const orgUrl = useOrgUrl();
  const { data, isLoading, error } = useOrgIssuesSummary();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-100">
            What needs attention
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Loading insights…
        </CardContent>
      </Card>
    );
  }

  // Gracefully degrade on error
  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-100">
            What needs attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-400">
            Unable to load organizational insights right now.
          </div>
        </CardContent>
      </Card>
    );
  }

  const { total, topIssues } = data;
  // Show top 3 on Overview (not the full 6 — IntegrityBanner handles the expanded list)
  const displayIssues = topIssues.slice(0, 3);

  // All clear state
  if (total === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-100">
            What needs attention
          </CardTitle>
          <Button asChild size="sm" variant="secondary">
            <Link href={orgUrl.admin}>View intelligence</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>All clear — no structural issues detected.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-medium text-slate-100">
          What needs attention
        </CardTitle>
        <Button asChild size="sm" variant="secondary">
          <Link href="/org/admin">View intelligence</Link>
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {displayIssues.map((issue) => (
          <IssueAttentionRow
            key={issue.issueKey}
            issueKey={issue.issueKey}
            severity={issue.severity}
            entityName={issue.entityName}
            explanation={issue.explanation}
            fixUrl={issue.fixUrl}
            fixAction={issue.fixAction}
          />
        ))}

        {total > displayIssues.length && (
          <div className="pt-1">
            <Button asChild variant="ghost" size="sm" className="text-xs w-full">
              <Link href={orgUrl.adminHealth}>
                View all {total} issues
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
