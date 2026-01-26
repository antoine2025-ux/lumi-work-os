"use client";

/**
 * Intelligence Issues Inbox
 *
 * Top 10 issues list with fix links, sorted deterministically.
 * Uses issueKey for stable React keys.
 */

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, ExternalLink } from "lucide-react";
import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";
import { cn } from "@/lib/utils";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";

type Props = {
  issues: OrgIssueMetadata[];
};

function SeverityIcon({ severity }: { severity: "error" | "warning" | "info" }) {
  if (severity === "error") {
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  }
  if (severity === "warning") {
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  }
  return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
}

function SeverityBadge({ severity }: { severity: "error" | "warning" | "info" }) {
  if (severity === "error") {
    return (
      <Badge variant="destructive" className="text-[10px]">
        Critical
      </Badge>
    );
  }
  if (severity === "warning") {
    return (
      <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
        Warning
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px]">
      Info
    </Badge>
  );
}

export function IntelligenceIssuesInbox({ issues }: Props) {
  if (issues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What Needs Attention</CardTitle>
        </CardHeader>
        <CardContent>
          <OrgEmptyState
            variant="good"
            title="Nothing needs attention right now"
            description="Your organization structure is healthy and aligned."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">What Needs Attention</CardTitle>
        <Link href="/org/issues">
          <Button variant="ghost" size="sm" className="text-xs">
            View all issues
            <ExternalLink className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {issues.map((issue) => (
            <div
              key={issue.issueKey}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50",
                issue.severity === "error" && "border-l-4 border-l-red-500",
                issue.severity === "warning" && "border-l-4 border-l-amber-500"
              )}
            >
              <div className="mt-0.5">
                <SeverityIcon severity={issue.severity} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">
                    {issue.entityName}
                  </span>
                  <SeverityBadge severity={issue.severity} />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {issue.explanation}
                </p>
              </div>

              <div className="shrink-0">
                <Link href={issue.fixUrl}>
                  <Button size="sm" variant="outline" className="text-xs">
                    {issue.fixAction}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
