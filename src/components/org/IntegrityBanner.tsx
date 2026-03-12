/**
 * Integrity Banner Component
 *
 * Displays a banner when data integrity issues are detected.
 * Shows issue counts and allows clicking to fix each issue.
 *
 * Data source: /api/org/issues/summary (canonical pipeline via listOrgIssues).
 * Only PENDING issues are returned — resolved/snoozed are excluded.
 */

"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AlertTriangle, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrgPrimaryCta } from "@/components/org/ui/OrgCtaButton";
import { Card } from "@/components/ui/card";
import { useOrgIssuesSummary } from "@/hooks/useOrgIssuesSummary";
import { IssueAttentionRow } from "@/components/org/issues/IssueAttentionRow";

export function IntegrityBanner() {
  const router = useRouter();
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>() ?? {};
  const [isExpanded, setIsExpanded] = useState(false);
  const { data, isLoading, error } = useOrgIssuesSummary();

  // Hide while loading or on error (banner is supplementary, not blocking)
  if (isLoading || error || !data) {
    return null;
  }

  if (data.total === 0) {
    return null;
  }

  const { total, countsBySeverity, topIssues } = data;
  const errorCount = countsBySeverity.error;
  const warningCount = countsBySeverity.warning;
  const issuesHref = workspaceSlug ? `/w/${workspaceSlug}/org/issues` : "/org/issues";

  const handleViewAll = () => {
    router.push(issuesHref);
  };

  return (
    <Card className="border-amber-500/30 bg-amber-950/20 mb-6">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-amber-100">
                  Fix required: {total} structural{" "}
                  {total === 1 ? "issue needs" : "issues need"} attention
                </span>
                {errorCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-300 border border-red-500/30 opacity-70">
                    {errorCount} error{errorCount !== 1 ? "s" : ""}
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 opacity-70">
                    {warningCount} warning{warningCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-200/80">
                Resolve these to keep org structure accurate and intelligence
                reliable.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Primary CTA - navigates to issues inbox */}
            <OrgPrimaryCta
              size="sm"
              onClick={handleViewAll}
              className="bg-amber-500 hover:bg-amber-400 text-slate-900"
            >
              Review issues
            </OrgPrimaryCta>
            {/* Secondary control - toggles inline preview */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-amber-200 hover:text-amber-100 hover:bg-amber-500/10"
            >
              {isExpanded ? (
                <X className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-amber-500/20">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {topIssues.map((issue) => (
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
            </div>
            {total > topIssues.length && (
              <div className="mt-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewAll}
                  className="text-xs text-amber-300 hover:text-amber-100"
                >
                  View all {total} issues
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
