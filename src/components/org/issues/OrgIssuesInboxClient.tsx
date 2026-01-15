"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getIssueTypeLabel } from "@/lib/org/issues/issueCopy";
import { OrgIssueDetailDrawer } from "@/components/org/issues/OrgIssueDetailDrawer";
import { AlertTriangle, CheckCircle, Eye } from "lucide-react";

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

function EntityTypeBadge({ entityType }: { entityType: string }) {
  return (
    <span className="text-[10px] text-slate-500 uppercase tracking-wide">
      {entityType}
    </span>
  );
}

export function OrgIssuesInboxClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const issueKeyFromUrl = searchParams.get("issue");

  // Filter state
  const [resolutionFilter, setResolutionFilter] = useState<"all" | Resolution>("PENDING");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  // Selected issue for drawer
  const [selectedIssueKey, setSelectedIssueKey] = useState<string | null>(issueKeyFromUrl);
  const [isUpdatingResolution, setIsUpdatingResolution] = useState(false);

  // Fetch issues - include resolved if filter is not PENDING or if deep link requires it
  const includeResolved = resolutionFilter !== "PENDING" || !!issueKeyFromUrl;
  
  const integrityQ = useOrgQuery(
    () => OrgApi.getIntegrity({ includeResolved }),
    [includeResolved]
  );

  // Handle deep link: if issue not found in current feed, show message
  const [deepLinkNotFound, setDeepLinkNotFound] = useState(false);

  useEffect(() => {
    if (issueKeyFromUrl && integrityQ.data?.issues) {
      const found = integrityQ.data.issues.some((i: IntegrityIssue) => i.issueKey === issueKeyFromUrl);
      if (!found && !includeResolved) {
        // Try fetching with includeResolved
        setResolutionFilter("all");
      } else if (!found && includeResolved) {
        setDeepLinkNotFound(true);
      } else {
        setDeepLinkNotFound(false);
        setSelectedIssueKey(issueKeyFromUrl);
      }
    }
  }, [issueKeyFromUrl, integrityQ.data?.issues, includeResolved]);

  // Get unique types for filter dropdown
  const issueTypes = useMemo(() => {
    if (!integrityQ.data?.issues) return [];
    const types = new Set(integrityQ.data.issues.map((i: IntegrityIssue) => i.type));
    return Array.from(types).sort();
  }, [integrityQ.data?.issues]);

  // Apply filters
  const filteredIssues = useMemo(() => {
    if (!integrityQ.data?.issues) return [];
    
    return integrityQ.data.issues.filter((issue: IntegrityIssue) => {
      if (resolutionFilter !== "all" && issue.resolution !== resolutionFilter) return false;
      if (typeFilter !== "all" && issue.type !== typeFilter) return false;
      if (entityTypeFilter !== "all" && issue.entityType !== entityTypeFilter) return false;
      if (severityFilter !== "all" && issue.severity !== severityFilter) return false;
      return true;
    });
  }, [integrityQ.data?.issues, resolutionFilter, typeFilter, entityTypeFilter, severityFilter]);

  // Sort: PENDING first, then severity desc, then firstSeen asc
  const sortedIssues = useMemo(() => {
    return [...filteredIssues].sort((a: IntegrityIssue, b: IntegrityIssue) => {
      // PENDING first
      if (a.resolution === "PENDING" && b.resolution !== "PENDING") return -1;
      if (a.resolution !== "PENDING" && b.resolution === "PENDING") return 1;
      
      // Then severity (error > warning)
      if (a.severity === "error" && b.severity !== "error") return -1;
      if (a.severity !== "error" && b.severity === "error") return 1;
      
      // Then firstSeen ascending
      const aDate = a.firstSeenAt ? new Date(a.firstSeenAt).getTime() : 0;
      const bDate = b.firstSeenAt ? new Date(b.firstSeenAt).getTime() : 0;
      return aDate - bDate;
    });
  }, [filteredIssues]);

  const selectedIssue = useMemo(() => {
    if (!selectedIssueKey || !integrityQ.data?.issues) return null;
    return integrityQ.data.issues.find((i: IntegrityIssue) => i.issueKey === selectedIssueKey) || null;
  }, [selectedIssueKey, integrityQ.data?.issues]);

  const handleIssueClick = (issue: IntegrityIssue) => {
    setSelectedIssueKey(issue.issueKey);
    // Update URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.set("issue", issue.issueKey);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  const handleCloseDrawer = () => {
    setSelectedIssueKey(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("issue");
    router.replace(url.pathname + url.search, { scroll: false });
  };

  const handleResolutionChange = async (resolution: Resolution, note?: string) => {
    if (!selectedIssue) return;
    
    setIsUpdatingResolution(true);
    try {
      const result = await OrgApi.updateIssueResolution({
        entityType: selectedIssue.entityType,
        entityId: selectedIssue.entityId,
        issueType: selectedIssue.type,
        resolution,
        resolutionNote: note,
      });

      if (!result.ok) {
        throw new Error("Failed to update resolution");
      }

      // Refetch to get updated data
      integrityQ.refetch();
    } finally {
      setIsUpdatingResolution(false);
    }
  };

  if (integrityQ.loading) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        Loading issues...
      </div>
    );
  }

  if (integrityQ.error) {
    return (
      <div className="text-sm text-destructive py-8 text-center">
        Failed to load issues: {integrityQ.error}
      </div>
    );
  }

  const pendingCount = integrityQ.data?.issues?.filter((i: IntegrityIssue) => i.resolution === "PENDING").length ?? 0;

  return (
    <div className="space-y-4">
      {/* Deep link not found message */}
      {deepLinkNotFound && (
        <Card className="border-amber-500/30 bg-amber-950/20">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-amber-200">
                Issue not found in current filter.
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setResolutionFilter("all");
                  setDeepLinkNotFound(false);
                }}
                className="text-amber-200 hover:text-amber-100"
              >
                Show all
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {pendingCount} pending issue{pendingCount !== 1 ? "s" : ""} • {sortedIssues.length} shown
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={resolutionFilter} onValueChange={(v) => setResolutionFilter(v as "all" | Resolution)}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
            <SelectItem value="FALSE_POSITIVE">Intentional</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Issue type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {issueTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {getIssueTypeLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            <SelectItem value="person">Person</SelectItem>
            <SelectItem value="team">Team</SelectItem>
            <SelectItem value="department">Department</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Issues list */}
      {sortedIssues.length === 0 ? (
        <Card className="border-slate-800">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-3" />
            <div className="text-sm font-medium text-slate-200">
              No unresolved issues detected.
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Your organization structure is complete.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sortedIssues.map((issue: IntegrityIssue) => (
            <Card
              key={issue.issueKey}
              className={`border-slate-800 hover:border-slate-700 transition-colors cursor-pointer ${
                selectedIssueKey === issue.issueKey ? "border-blue-500/50 bg-blue-950/10" : ""
              }`}
              onClick={() => handleIssueClick(issue)}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {issue.severity === "error" ? (
                        <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                      )}
                      <span className="text-sm font-medium text-slate-200 truncate">
                        {issue.message}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <EntityTypeBadge entityType={issue.entityType} />
                      <span className="text-[10px] text-slate-500">•</span>
                      <span className="text-[10px] text-slate-400">
                        {getIssueTypeLabel(issue.type)}
                      </span>
                      {issue.firstSeenAt && (
                        <>
                          <span className="text-[10px] text-slate-500">•</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(issue.firstSeenAt).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <SeverityBadge severity={issue.severity} />
                    <ResolutionBadge resolution={issue.resolution} />
                    <Eye className="h-4 w-4 text-slate-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Issue detail drawer */}
      {selectedIssue && (
        <OrgIssueDetailDrawer
          issue={selectedIssue}
          onClose={handleCloseDrawer}
          onResolutionChange={handleResolutionChange}
          isUpdating={isUpdatingResolution}
        />
      )}
    </div>
  );
}

