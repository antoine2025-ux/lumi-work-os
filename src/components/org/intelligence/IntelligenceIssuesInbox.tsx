"use client";

/**
 * Intelligence Issues Inbox
 *
 * Top 10 issues list with fix links, sorted deterministically.
 * Uses issueKey for stable React keys.
 *
 * Renders each row via the shared IssueAttentionRow component
 * for visual consistency with the Overview page.
 */

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { IssueAttentionRow } from "@/components/org/issues/IssueAttentionRow";

type Props = {
  issues: OrgIssueMetadata[];
};

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
      </CardContent>
    </Card>
  );
}
