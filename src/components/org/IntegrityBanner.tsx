/**
 * Integrity Banner Component
 * 
 * Displays a banner when data integrity issues are detected.
 * Shows issue counts and allows clicking to fix each issue.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";

type IntegrityIssue = {
  issueKey: string;
  type: string;
  entityType: "person" | "team" | "department" | "position";
  entityId: string;
  entityName: string;
  severity: "error" | "warning";
  message: string;
  fixUrl?: string;
  resolution: "PENDING" | "ACKNOWLEDGED" | "FALSE_POSITIVE" | "RESOLVED";
};

type IntegrityData = {
  ok: boolean;
  totalIssues: number;
  issues: IntegrityIssue[];
  summary: {
    person_missing_team: number;
    person_missing_department: number;
    person_missing_manager: number;
    team_missing_department: number;
    team_missing_owner: number;
    department_missing_owner: number;
    manager_cycle: number;
  };
};

export function IntegrityBanner() {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  // Fetch only PENDING issues (default behavior)
  const integrityQ = useOrgQuery(() => OrgApi.getIntegrity({ resolution: "PENDING" }), []);

  if (integrityQ.loading) {
    return null;
  }

  if (integrityQ.error || !integrityQ.data?.ok) {
    return null;
  }

  const data = integrityQ.data as IntegrityData;

  if (data.totalIssues === 0) {
    return null;
  }

  const errorCount = data.issues.filter((i) => i.severity === "error").length;
  const warningCount = data.issues.filter((i) => i.severity === "warning").length;

  const handleFixClick = (issue: IntegrityIssue) => {
    // Navigate to the issues inbox with this issue selected
    router.push(`/org/issues?issue=${encodeURIComponent(issue.issueKey)}`);
  };

  const handleViewAll = () => {
    router.push("/org/issues");
  };

  return (
    <Card className="border-amber-500/30 bg-amber-950/20 mb-6">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <button 
                  onClick={handleViewAll}
                  className="text-sm font-semibold text-amber-100 hover:text-amber-50 transition-colors underline-offset-2 hover:underline"
                >
                  Fix required: {data.totalIssues} {data.totalIssues === 1 ? "issue" : "issues"} found
                </button>
                {errorCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                    {errorCount} error{errorCount !== 1 ? "s" : ""}
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {warningCount} warning{warningCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-200/80">
                Some data is incomplete or has integrity issues. Fix these to ensure accurate reporting and Loopbrain indexing.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-amber-200 hover:text-amber-100 hover:bg-amber-500/10 shrink-0"
          >
            {isExpanded ? <X className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-amber-500/20">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.issues.map((issue, idx) => (
                <button
                  key={`${issue.type}-${issue.entityId}-${idx}`}
                  onClick={() => handleFixClick(issue)}
                  className={cn(
                    "w-full text-left p-2 rounded-md transition-colors",
                    "hover:bg-amber-500/10",
                    issue.severity === "error"
                      ? "border border-red-500/20 bg-red-950/10"
                      : "border border-amber-500/20 bg-amber-950/10"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-amber-100 truncate">
                        {issue.message}
                      </div>
                      <div className="text-[10px] text-amber-300/60 mt-0.5">
                        {issue.entityType} • {issue.type.replace(/_/g, " ")}
                      </div>
                    </div>
                    {issue.fixUrl && (
                      <ChevronRight className="h-3 w-3 text-amber-400 shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

