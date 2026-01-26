"use client";

/**
 * Intelligence Issues Table
 *
 * Reusable table component for drilldown views.
 * Deterministic ordering: severity desc, issueKey asc.
 *
 * Action Column Behavior:
 * - If fixUrl exists → show "Fix" button linking to fix surface
 * - If fixUrl is missing → show "View details" linking to Issues page
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, AlertTriangle, Info, ExternalLink } from "lucide-react";
import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";
import { getIssueTypeLabel } from "@/lib/org/issues/issueCopy";
import {
  type IntelligenceSectionKey,
  buildDrilldownIssuesLink,
} from "@/lib/org/intelligence/sections";
import { cn } from "@/lib/utils";
import { SeverityBadge } from "@/components/org/SeverityBadge";

type Props = {
  issues: Array<OrgIssueMetadata & { _impactData?: { impactBadge?: string; affectedCount?: number } | null }>;
  section: IntelligenceSectionKey;
  currentSeverityFilter?: "critical" | "warning" | "info";
};

function SeverityIcon({ severity }: { severity: "error" | "warning" | "info" }) {
  if (severity === "error") {
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  }
  if (severity === "warning") {
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  }
  return <Info className="h-4 w-4 text-muted-foreground" />;
}

/**
 * Build the fallback "View details" link when fixUrl is not available.
 * Preserves section types and current severity filter.
 */
function buildViewDetailsLink(
  section: IntelligenceSectionKey,
  currentSeverityFilter?: "critical" | "warning" | "info"
): string {
  return buildDrilldownIssuesLink(section, { severity: currentSeverityFilter });
}

export function IntelligenceIssuesTable({
  issues,
  section,
  currentSeverityFilter,
}: Props) {
  if (issues.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
        <div className="font-medium text-muted-foreground">No issues in this category</div>
        <div className="text-sm text-muted-foreground mt-1">
          Your organization is looking healthy in this area
        </div>
      </div>
    );
  }

  // Fallback link for issues without fixUrl
  const fallbackLink = buildViewDetailsLink(section, currentSeverityFilter);

  // Phase P: Show Impact column only for impact/work sections
  const showImpactColumn = section === "impact" || section === "work";

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Severity</TableHead>
            <TableHead className="w-[180px]">Type</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead className="max-w-[300px]">Explanation</TableHead>
            {showImpactColumn && (
              <TableHead className="w-[120px]">Impact</TableHead>
            )}
            <TableHead className="w-[100px] text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.map((issue) => (
            <TableRow
              key={issue.issueKey}
              className={cn(
                issue.severity === "error" && "bg-red-500/5",
                issue.severity === "warning" && "bg-amber-500/5"
              )}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <SeverityIcon severity={issue.severity} />
                  <SeverityBadge severity={issue.severity} />
                </div>
              </TableCell>
              <TableCell>
                <span className="text-xs font-medium text-muted-foreground">
                  {getIssueTypeLabel(issue.type)}
                </span>
              </TableCell>
              <TableCell>
                <Link
                  href={issue.fixUrl ? `${issue.fixUrl}${issue.fixUrl.includes('?') ? '&' : '?'}from=intelligence` : fallbackLink}
                  className="font-medium text-primary hover:underline"
                >
                  {issue.entityName}
                </Link>
              </TableCell>
              <TableCell>
                <span
                  className="text-sm text-muted-foreground line-clamp-2"
                  title={issue.explanation}
                >
                  {issue.explanation}
                </span>
              </TableCell>
              {showImpactColumn && (
                <TableCell>
                  {issue._impactData ? (
                    <div className="flex items-center gap-2">
                      {issue._impactData.impactBadge && (
                        <Badge
                          variant={
                            issue._impactData.impactBadge === "HIGH"
                              ? "destructive"
                              : issue._impactData.impactBadge === "MEDIUM"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-[10px]"
                        >
                          {issue._impactData.impactBadge}
                        </Badge>
                      )}
                      {issue._impactData.affectedCount !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          {issue._impactData.affectedCount} affected
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              )}
              <TableCell className="text-right">
                {issue.fixUrl ? (
                  <Link href={`${issue.fixUrl}${issue.fixUrl.includes('?') ? '&' : '?'}from=intelligence`}>
                    <Button size="sm" variant="outline" className="text-xs h-7">
                      {issue.fixAction || "Fix"}
                    </Button>
                  </Link>
                ) : (
                  <Link href={fallbackLink}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7 text-muted-foreground"
                    >
                      View details
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
