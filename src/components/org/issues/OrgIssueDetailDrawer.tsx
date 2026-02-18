"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ExternalLink } from "lucide-react";
import { getIssueExplanation, getIssueTypeLabel, getResolutionExplanation } from "@/lib/org/issues/issueCopy";
import { OrgIssueResolutionActions } from "@/components/org/issues/OrgIssueResolutionActions";
import { ExplainabilityPanel } from "@/components/org/explainability/ExplainabilityPanel";
import Link from "next/link";
import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";

type Resolution = "PENDING" | "ACKNOWLEDGED" | "FALSE_POSITIVE" | "RESOLVED";

type IntegrityIssue = {
  issueKey: string;
  type: string;
  entityType: "person" | "team" | "department" | "position";
  entityId: string;
  entityName: string;
  severity: "error" | "warning";
  message: string;
  fixUrl?: string;
  resolution: Resolution;
  resolutionNote: string | null;
  resolvedById: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  firstSeenAt: string | null;
};

function SeverityBadge({ severity }: { severity: "error" | "warning" }) {
  if (severity === "error") {
    return (
      <Badge variant="destructive" className="text-[10px]">
        Error
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/30">
      Warning
    </Badge>
  );
}

function ResolutionBadge({ resolution }: { resolution: Resolution }) {
  switch (resolution) {
    case "PENDING":
      return (
        <Badge variant="outline" className="text-[10px] border-slate-500 text-slate-400">
          Pending
        </Badge>
      );
    case "ACKNOWLEDGED":
      return (
        <Badge variant="secondary" className="text-[10px] bg-blue-500/20 text-blue-300 border-blue-500/30">
          Acknowledged
        </Badge>
      );
    case "FALSE_POSITIVE":
      return (
        <Badge variant="secondary" className="text-[10px] bg-purple-500/20 text-purple-300 border-purple-500/30">
          Intentional
        </Badge>
      );
    case "RESOLVED":
      return (
        <Badge variant="secondary" className="text-[10px] bg-green-500/20 text-green-300 border-green-500/30">
          Resolved
        </Badge>
      );
    default:
      return null;
  }
}

type OrgIssueDetailDrawerProps = {
  issue: IntegrityIssue | OrgIssueMetadata; // Accept either format during migration
  onClose: () => void;
  onResolutionChange?: (resolution: Resolution, note?: string) => Promise<void>;
  isUpdating?: boolean;
};

export function OrgIssueDetailDrawer({
  issue,
  onClose,
  onResolutionChange,
  isUpdating = false,
}: OrgIssueDetailDrawerProps) {
  const formatDate = (isoString: string | null) => {
    if (!isoString) return null;
    return new Date(isoString).toLocaleString();
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-[#0a0f1a] border-l border-slate-800 shadow-xl z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-[#0a0f1a] border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-100">Issue Details</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-6 space-y-6">
        {/* Entity info */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Entity</div>
          <div className="text-slate-100 font-medium">{issue.entityName}</div>
          <div className="text-xs text-slate-500 mt-1 capitalize">
            {typeof issue.entityType === "string" ? issue.entityType.toLowerCase() : ""}
          </div>
        </div>

        {/* Issue type and severity */}
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Issue Type</div>
            <div className="text-slate-200">{getIssueTypeLabel(issue.type)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Severity</div>
            <SeverityBadge severity={issue.severity as "error" | "warning"} />
          </div>
        </div>

        {/* Explainability */}
        {"explainability" in issue && issue.explainability ? (
          <ExplainabilityPanel
            explainability={issue.explainability}
            explanation={issue.explanation}
            fixAction={issue.fixAction}
          />
        ) : (
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Detected Because</div>
            <div className="text-sm text-slate-300 bg-slate-800/50 rounded-lg px-3 py-2">
              {"message" in issue ? issue.message : getIssueExplanation(issue.type)}
            </div>
            {"fixAction" in issue && issue.fixAction && (
              <div className="mt-3">
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">What Changes It</div>
                <div className="text-sm text-slate-300 bg-slate-800/50 rounded-lg px-3 py-2">
                  {issue.fixAction}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Resolution status */}
        <div className="border-t border-slate-800 pt-6">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-3">Resolution Status</div>
          <div className="flex items-center gap-3 mb-4">
            <ResolutionBadge resolution={("resolution" in issue ? issue.resolution : "PENDING") as Resolution} />
          </div>

          {/* Resolution explanation - only shown when not PENDING */}
          {"resolution" in issue && issue.resolution !== "PENDING" && (
            <div className="bg-slate-800/30 rounded-lg px-3 py-2 mt-3">
              <div className="text-xs text-slate-500 mb-1">Resolved because</div>
              <div className="text-sm text-slate-300">
                {getResolutionExplanation(issue.type) ?? "This issue has been addressed."}
              </div>
              {/* Resolution timestamp - micro-trust signal */}
              {"resolvedAt" in issue && issue.resolvedAt && (
                <div className="text-[10px] text-slate-500 mt-1">
                  Resolved on {new Date(issue.resolvedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              )}
            </div>
          )}

          {/* Resolution audit info */}
          {"resolvedByName" in issue && issue.resolvedByName && (
            <div className="text-xs text-slate-500 mt-3">
              Updated by <span className="text-slate-400">{issue.resolvedByName}</span>
              {"resolvedAt" in issue && issue.resolvedAt && (
                <> on <span className="text-slate-400">{formatDate(issue.resolvedAt)}</span></>
              )}
            </div>
          )}

          {"resolutionNote" in issue && issue.resolutionNote && (
            <div className="mt-3">
              <div className="text-xs text-slate-500 mb-1">Note</div>
              <div className="text-sm text-slate-300 bg-slate-800/50 rounded-lg px-3 py-2">
                {issue.resolutionNote}
              </div>
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="border-t border-slate-800 pt-6 space-y-2">
          {"firstSeenAt" in issue && issue.firstSeenAt && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">First detected</span>
              <span className="text-slate-400">{formatDate(issue.firstSeenAt)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-slate-800 pt-6">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-3">Actions</div>
          <div className="space-y-3">
            {issue.fixUrl && (
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link href={issue.fixUrl}>
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Go to entity
                </Link>
              </Button>
            )}
            
            {onResolutionChange && (
              <div className="pt-2 border-t border-slate-800/50">
                <div className="text-xs text-slate-500 mb-2">Resolution</div>
                <OrgIssueResolutionActions
                  currentResolution={"resolution" in issue ? issue.resolution : "PENDING"}
                  onResolve={onResolutionChange}
                  isLoading={isUpdating}
                />
              </div>
            )}

            {/* Back to issues - escape hatch for resolved issues */}
            {"resolution" in issue && issue.resolution !== "PENDING" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs text-slate-400 mt-4 w-full"
              >
                Back to issues
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

