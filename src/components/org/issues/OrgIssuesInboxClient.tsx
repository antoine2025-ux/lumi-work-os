"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrgPrimaryCta } from "@/components/org/ui/OrgCtaButton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getIssueTypeLabel, getIssueExplanation, getIssueOutcomeHint } from "@/lib/org/issues/issueCopy";
import { OrgIssueDetailDrawer } from "@/components/org/issues/OrgIssueDetailDrawer";
import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { mutationBus } from "@/lib/org/mutations";
import type { OrgIssueMetadata, OrgIssue, CapacityThresholds } from "@/lib/org/deriveIssues";
import type { SerializedIssueWindow, IntelligenceResponseMeta } from "@/lib/org/intelligence/types";
import { WhyThisAnswerPanel } from "@/components/org/intelligence/WhyThisAnswerPanel";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { SeverityBadge } from "@/components/org/SeverityBadge";

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

// Type adapter: convert IntegrityIssue to OrgIssueMetadata
// Preserves critical fields: issueKey, severity, fixUrl/fixAction for display + Fix button behavior
function normalizeIssue(issue: IntegrityIssue): OrgIssueMetadata {
  return {
    issueKey: issue.issueKey, // Preserved: primary identifier
    issueId: issue.issueKey, // Use issueKey as ID
    type: issue.type as OrgIssue,
    severity: issue.severity, // Preserved: affects sorting and display
    entityType: (issue.entityType.toUpperCase() as "PERSON" | "TEAM" | "DEPARTMENT" | "POSITION") as OrgIssueMetadata["entityType"],
    entityId: issue.entityId,
    entityName: issue.entityName,
    explanation: getIssueExplanation(issue.type),
    fixUrl: issue.fixUrl || "", // Preserved: Fix button behavior
    fixAction: "Fix issue", // Default, can be enhanced
  };
}

// Sorting helper with canonical severity ordering
function sortIssuesDeterministically(issues: OrgIssueMetadata[]): OrgIssueMetadata[] {
  const severityRank = (s: "error" | "warning" | "info") => {
    switch (s) {
      case "error": return 3;
      case "warning": return 2;
      case "info": return 1;
      default: return 0;
    }
  };
  
  return [...issues].sort((a, b) => {
    // Primary: severity desc (error > warning > info)
    const severityDiff = severityRank(b.severity) - severityRank(a.severity);
    if (severityDiff !== 0) return severityDiff;
    
    // Secondary: issueKey asc (tie-breaker)
    return a.issueKey.localeCompare(b.issueKey);
  });
}

// SeverityBadge is now imported from @/components/org/SeverityBadge


export function OrgIssuesInboxClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const issueKeyFromUrl = searchParams.get("issue");
  
  // Parse ?types=TYPE1,TYPE2 query param for filtering from Intelligence landing
  const typesFromUrl = searchParams.get("types");
  const typesFilter = useMemo(() => {
    if (!typesFromUrl) return null;
    return typesFromUrl.split(",").filter(Boolean);
  }, [typesFromUrl]);

  // Filter state
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  // Selected issue for drawer
  const [selectedIssueKey, setSelectedIssueKey] = useState<string | null>(issueKeyFromUrl);
  const [isUpdatingResolution, setIsUpdatingResolution] = useState(false);

  // Base issues state (canonical fetched issues + mutation deltas)
  const [baseIssues, setBaseIssues] = useState<OrgIssueMetadata[]>([]);
  // Response metadata from the integrity endpoint - shape varies by endpoint version
  type ResponseMeta = {
    generatedAt?: string;
    assumptionsId?: string;
    issueWindow?: { start: string; end: string; label: string };
    thresholds?: Record<string, unknown>;
    [key: string]: unknown;
  };
  const [responseMeta, setResponseMeta] = useState<ResponseMeta | null>(null);
  const [appliedMutationIds, setAppliedMutationIds] = useState<string[]>([]);
  const appliedMutationIdsRef = useRef<Set<string>>(new Set()); // Dedup guard (capped to last ~200)
  const MAX_DEDUP_IDS = 200;

  // Optimistic removal state - issues resolved this session disappear immediately
  const [locallyRemovedKeys, setLocallyRemovedKeys] = useState<Set<string>>(new Set());
  const [resolvedThisSession, setResolvedThisSession] = useState(0);

  // Post-fix return helper - shows when user returns from fix surface
  const [showReturnHelper, setShowReturnHelper] = useState(false);

  // Fetch issues
  const integrityQ = useOrgQuery(
    () => OrgApi.getIntegrity({ includeResolved: true }),
    []
  );

  // Handle deep link: if issue not found in current feed, show message
  const [deepLinkNotFound, setDeepLinkNotFound] = useState(false);

  useEffect(() => {
    if (issueKeyFromUrl && baseIssues.length) {
      const found = baseIssues.some((i: OrgIssueMetadata) => i.issueKey === issueKeyFromUrl);
      if (!found) {
        setDeepLinkNotFound(true);
      } else {
        setDeepLinkNotFound(false);
        setSelectedIssueKey(issueKeyFromUrl);
      }
    }
  }, [issueKeyFromUrl, baseIssues]);

  // On fetch success, explicitly initialize baseIssues
  useEffect(() => {
    if (integrityQ.data?.issues) {
      const normalized = integrityQ.data.issues.map(normalizeIssue);
      setBaseIssues(normalized);
      // Note: integrity endpoint may not return responseMeta, so we'll handle it gracefully
      // Store any metadata that might be available
      const dataWithMeta = integrityQ.data as unknown as { responseMeta?: ResponseMeta };
      if (dataWithMeta.responseMeta) {
        setResponseMeta(dataWithMeta.responseMeta);
      }
    }
  }, [integrityQ.data]);

  // Subscribe to mutation bus for real-time coherence
  useEffect(() => {
    const unsubscribe = mutationBus.subscribe((event) => {
      // Dedup guard: prevent double-application if component remounts
      // Dedup by mutationId (not patchType) - mutationId is the stable identifier
      if (appliedMutationIdsRef.current.has(event.mutationId)) {
        return; // Already applied
      }
      appliedMutationIdsRef.current.add(event.mutationId);
      
      // Cap dedup set to prevent unbounded growth
      if (appliedMutationIdsRef.current.size > MAX_DEDUP_IDS) {
        const idsArray = Array.from(appliedMutationIdsRef.current);
        const toRemove = idsArray.slice(0, idsArray.length - MAX_DEDUP_IDS);
        toRemove.forEach((id) => appliedMutationIdsRef.current.delete(id));
      }
      
      setBaseIssues((prev) => {
        // Build resolved keys set
        const resolvedKeys = new Set(event.affectedIssues.resolved.map(r => r.issueKey));
        
        // Build active issues map by key
        // Note: Bus events already have OrgIssueMetadata, no normalization needed
        const activeByKey = new Map(
          event.affectedIssues.active.map(i => [i.issueKey, i])
        );
        
        // Convert current list to Map for O(1) lookups (avoid O(n²) findIndex)
        const currentMap = new Map(prev.map(i => [i.issueKey, i]));
        
        // 1. Remove resolved
        resolvedKeys.forEach(key => currentMap.delete(key));
        
        // 2. Upsert active
        activeByKey.forEach((issue, key) => {
          currentMap.set(key, issue);
        });
        
        // 3. Convert back to array and sort deterministically
        const updated = Array.from(currentMap.values());
        return sortIssuesDeterministically(updated);
      });
      
      // Track mutation for explainability (keep last 10)
      setAppliedMutationIds(prev => [...prev.slice(-9), event.mutationId]);
    });
    
    return unsubscribe;
  }, []);

  // Check if returning from fix surface
  useEffect(() => {
    const returnFlag = sessionStorage.getItem("returnedFromFix");
    if (returnFlag) {
      setShowReturnHelper(true);
      sessionStorage.removeItem("returnedFromFix");
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => setShowReturnHelper(false), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Get unique types for filter dropdown (from baseIssues)
  const issueTypes = useMemo(() => {
    if (!baseIssues.length) return [];
    const types = new Set(baseIssues.map(i => i.type));
    return Array.from(types).sort();
  }, [baseIssues]);

  // Apply filters over baseIssues
  // Note: typesFilter from URL (?types=) is purely client-side filtering
  // Note: resolution filter is handled separately since baseIssues doesn't have resolution field
  // For now, we'll filter by type, entityType, and severity only
  const filteredIssues = useMemo(() => {
    if (!baseIssues.length) return [];
    
    return baseIssues.filter((issue: OrgIssueMetadata) => {
      // URL-based types filter (from Intelligence landing)
      if (typesFilter && typesFilter.length > 0 && !typesFilter.includes(issue.type)) {
        return false;
      }
      if (typeFilter !== "all" && issue.type !== typeFilter) return false;
      if (entityTypeFilter !== "all" && issue.entityType.toLowerCase() !== entityTypeFilter) return false;
      if (severityFilter !== "all" && issue.severity !== severityFilter) return false;
      return true;
    });
  }, [baseIssues, typeFilter, entityTypeFilter, severityFilter, typesFilter]);

  // Issues are already sorted deterministically by mutation bus subscription
  // Just use filteredIssues directly (they're already sorted)
  const sortedIssues = filteredIssues;

  // Filter out optimistically removed issues for display
  const displayIssues = useMemo(() => {
    return sortedIssues.filter((i: OrgIssueMetadata) => !locallyRemovedKeys.has(i.issueKey));
  }, [sortedIssues, locallyRemovedKeys]);

  const selectedIssue = useMemo(() => {
    if (!selectedIssueKey || !baseIssues.length) return null;
    const issue = baseIssues.find((i: OrgIssueMetadata) => i.issueKey === selectedIssueKey);
    if (!issue) return null;
    // Pass OrgIssueMetadata directly to drawer (it accepts both formats)
    return issue;
  }, [selectedIssueKey, baseIssues]);

  const handleIssueClick = (issue: OrgIssueMetadata) => {
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
        entityType: selectedIssue.entityType.toLowerCase() as "person" | "team" | "department" | "position",
        entityId: selectedIssue.entityId,
        issueType: selectedIssue.type,
        resolution,
        resolutionNote: note,
      });

      if (!result.ok) {
        throw new Error("Failed to update resolution");
      }

      // Optimistic removal with idempotency guard
      // Only remove if RESOLVED/FALSE_POSITIVE and not already removed
      if (
        (resolution === "RESOLVED" || resolution === "FALSE_POSITIVE") &&
        !locallyRemovedKeys.has(selectedIssue.issueKey)
      ) {
        setLocallyRemovedKeys(prev => new Set(prev).add(selectedIssue.issueKey));
        setResolvedThisSession(prev => prev + 1);
      }

      // Refetch to get updated data (background sync)
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

  // Note: baseIssues doesn't have resolution field, so we can't filter by PENDING
  // For now, show all issues as "pending" (they're all active issues)
  const pendingCount = baseIssues.length;

  return (
    <div className="space-y-6">
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
                  setDeepLinkNotFound(false);
                }}
                className="text-amber-200 hover:text-amber-100"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Post-fix return helper - auto-dismisses */}
      {showReturnHelper && (
        <div className="text-xs text-muted-foreground mb-2">
          Issue list updated based on recent changes.
        </div>
      )}

      {/* Resolved recently counter - session only */}
      {resolvedThisSession > 0 && (
        <div className="text-xs text-muted-foreground mb-2">
          {resolvedThisSession} issue{resolvedThisSession !== 1 ? "s" : ""} resolved recently
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {pendingCount} pending issue{pendingCount !== 1 ? "s" : ""} • {displayIssues.length} shown
        </div>
      </div>

      {/* URL-based types filter indicator */}
      {typesFilter && typesFilter.length > 0 && (
        <Card className="border-blue-500/30 bg-blue-950/20">
          <CardContent className="py-2 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-200">
                  Filtered by {typesFilter.length} type{typesFilter.length !== 1 ? "s" : ""}:
                </span>
                <div className="flex flex-wrap gap-1">
                  {typesFilter.slice(0, 3).map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">
                      {getIssueTypeLabel(t)}
                    </Badge>
                  ))}
                  {typesFilter.length > 3 && (
                    <Badge variant="outline" className="text-[10px]">
                      +{typesFilter.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.delete("types");
                  router.replace(url.pathname + url.search, { scroll: false });
                }}
                className="text-blue-200 hover:text-blue-100 h-6 text-xs"
              >
                Clear filter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters (Secondary - compact when unused) */}
      <div className={cn(
        "flex flex-wrap gap-2 transition-opacity",
        displayIssues.length === 0 ? "opacity-40" : "opacity-80"
      )}>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px] h-7 text-xs bg-card/50 border-border">
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
          <SelectTrigger className="w-[130px] h-7 text-xs bg-card/50 border-border">
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
          <SelectTrigger className="w-[110px] h-7 text-xs bg-card/50 border-border">
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
      {displayIssues.length === 0 ? (
        <OrgEmptyState
          variant="good"
          title="All issues resolved"
          description="Your organization structure is healthy and aligned based on current data."
        />
      ) : (
        <div className="space-y-2">
          {/* Guidance text when few issues */}
          {displayIssues.length > 0 && displayIssues.length <= 3 && (
            <div className="text-xs text-muted-foreground mb-2 px-1">
              These are the issues that need attention in your organization structure. Keeping these clean improves reporting accuracy.
            </div>
          )}
          
          {displayIssues.map((issue: OrgIssueMetadata) => (
            <Card
              key={issue.issueKey}
              className={cn(
                "border-border hover:border-border transition-colors cursor-pointer",
                selectedIssueKey === issue.issueKey && "border-blue-500/50 bg-blue-950/10"
              )}
              onClick={() => handleIssueClick(issue)}
            >
              <CardContent className="py-3 px-4">
                {/* 3-zone row layout: Left (entity) | Middle (explanation) | Right (actions) */}
                <div className="flex items-start gap-4">
                  {/* Left Zone: Entity name + type/issue label */}
                  <div className="min-w-0 w-[200px] shrink-0">
                    <div className="flex items-center gap-2">
                      {issue.severity === "error" ? (
                        <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                      )}
                      <span className="font-medium text-foreground truncate">
                        {issue.entityName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 ml-6">
                      <span className="text-[10px] text-muted-foreground uppercase">
                        {issue.entityType.toLowerCase()}
                      </span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-muted-foreground">
                        {getIssueTypeLabel(issue.type)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Middle Zone: Explanation + outcome hint */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-muted-foreground">
                      {issue.explanation}
                    </div>
                    {getIssueOutcomeHint(issue.type) && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {getIssueOutcomeHint(issue.type)}
                      </div>
                    )}
                  </div>
                  
                  {/* Right Zone: Fix button + Status + Severity */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Fix action intentionally bypasses issue drawer and navigates to fix surface */}
                    {issue.fixUrl && (
                      <OrgPrimaryCta
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Set flag so we show return helper when user comes back
                          sessionStorage.setItem("returnedFromFix", "true");
                          const fixUrl = `${issue.fixUrl}${issue.fixUrl.includes('?') ? '&' : '?'}from=issues`;
                          router.push(fixUrl);
                        }}
                      >
                        Fix
                      </OrgPrimaryCta>
                    )}
                    <SeverityBadge severity={issue.severity as "error" | "warning"} />
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

      {/* Tertiary: Explainability Footer (reduced contrast, collapsed by default) */}
      {(responseMeta || appliedMutationIds.length > 0) && (
        <div className="mt-6 opacity-60 border-white/5">
          {/* Full panel if integrity endpoint returns required fields */}
          {responseMeta && responseMeta.issueWindow && responseMeta.thresholds ? (
            <>
              {/* Show local UI note if mutations were applied (separate from server assumptions) */}
              {appliedMutationIds.length > 0 && (
                <div className="text-xs text-muted-foreground mb-2">
                  Updated by {appliedMutationIds.length} recent fix{appliedMutationIds.length !== 1 ? "es" : ""} (mutation bus)
                </div>
              )}
              <WhyThisAnswerPanel
                issueWindow={responseMeta.issueWindow as unknown as SerializedIssueWindow}
                thresholds={responseMeta.thresholds as unknown as CapacityThresholds & { issueWindowDays: number }}
                responseMeta={responseMeta as unknown as IntelligenceResponseMeta}
              />
            </>
          ) : (
            /* Minimal footer for older integrity payloads - always show "why it changed" hint */
            <Card className="border-dashed border-white/5">
              <CardContent className="py-3 px-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <Info className="h-3.5 w-3.5" />
                    Response Metadata
                  </div>
                  <div className="grid gap-2 text-sm">
                    {responseMeta?.generatedAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Generated At</span>
                        <span className="font-mono text-xs">
                          {new Date(responseMeta.generatedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {responseMeta?.assumptionsId && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Assumptions ID</span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {responseMeta.assumptionsId}
                        </Badge>
                      </div>
                    )}
                    {appliedMutationIds.length > 0 && (
                      <div className="flex justify-between items-center pt-2 border-t border-white/5">
                        <span className="text-muted-foreground">Updates Applied</span>
                        <span className="text-xs text-muted-foreground">
                          {appliedMutationIds.length} fix{appliedMutationIds.length !== 1 ? "es" : ""} via mutation bus
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

