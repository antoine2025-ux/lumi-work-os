"use client";

/**
 * Intelligence Drilldown Client
 *
 * Client component for section-specific drilldown views.
 * Fetches from landing API and filters client-side by section.
 *
 * Features:
 * - Time window selector (reused from landing)
 * - Severity filter (all/critical/warning/info)
 * - Table-based issue display
 * - Links to Issues page with preserved filters
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { IntelligenceLandingResult } from "@/lib/org/intelligence/types";
import {
  type IntelligenceSectionKey,
  SECTION_CONFIG,
  buildDrilldownIssuesLink,
} from "@/lib/org/intelligence/sections";
import { IntelligenceIssuesTable } from "./IntelligenceIssuesTable";
import { mutationBus } from "@/lib/org/mutations/bus";

type TimeWindowPreset = "next7days" | "custom";
type SeverityFilter = "all" | "critical" | "warning" | "info";

type Props = {
  section: IntelligenceSectionKey;
  isAdmin: boolean;
};

export function IntelligenceDrilldownClient({ section }: Props) {
  const config = SECTION_CONFIG[section];
  const searchParams = useSearchParams();
  const router = useRouter();

  // State
  const [data, setData] = useState<IntelligenceLandingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Time window state
  const [preset, setPreset] = useState<TimeWindowPreset>("next7days");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  // Severity filter - read from URL or default to "all"
  const initialSeverity = (searchParams.get("severity") as SeverityFilter) || "all";
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>(
    ["all", "critical", "warning", "info"].includes(initialSeverity) 
      ? initialSeverity 
      : "all"
  );

  // Build query params for API
  const buildQueryParams = useCallback(() => {
    if (preset === "next7days") {
      return "";
    }
    if (preset === "custom" && customStart && customEnd) {
      return `?start=${encodeURIComponent(customStart)}&end=${encodeURIComponent(customEnd)}`;
    }
    return "";
  }, [preset, customStart, customEnd]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = buildQueryParams();
      const response = await fetch(`/api/org/intelligence/landing${queryParams}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || "Unknown error");
      }

      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Subscribe to mutation bus for real-time coherence
  useEffect(() => {
    const unsubscribe = mutationBus.subscribe((event) => {
      if (event.affectedIssues.resolved.length > 0) {
        // Remove resolved issues from local state
        setData((prev) => {
          if (!prev) return prev;
          const resolvedKeys = new Set(event.affectedIssues.resolved.map((i) => i.issueKey));

          // Filter issues from allIssues
          const updatedAllIssues = prev.allIssues.filter((i) => !resolvedKeys.has(i.issueKey));
          const updatedTopIssues = prev.topIssues.filter((i) => !resolvedKeys.has(i.issueKey));

          return {
            ...prev,
            topIssues: updatedTopIssues,
            allIssues: updatedAllIssues,
          };
        });
      }
    });
    return unsubscribe;
  }, []);

  // Handle preset change
  const handlePresetChange = (value: TimeWindowPreset) => {
    setPreset(value);
    if (value === "next7days") {
      setCustomStart("");
      setCustomEnd("");
    }
  };

  // Handle severity filter change
  const handleSeverityChange = (value: SeverityFilter) => {
    setSeverityFilter(value);
    // Update URL without navigation
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("severity");
    } else {
      params.set("severity", value);
    }
    const newUrl = params.toString() ? `?${params.toString()}` : "";
    router.replace(`/org/intelligence/${section}${newUrl}`, { scroll: false });
  };

  // Handle custom date apply
  const handleApplyCustomDates = () => {
    if (customStart && customEnd) {
      fetchData();
    }
  };

  // Phase P: Build impactSummaryByWorkRequestId map once from landing payload
  const impactSummaryByWorkRequestId = useMemo(() => {
    if (!data?.impactSummariesByWorkRequestId) return new Map<string, import("@/lib/org/impact/types").WorkImpactSummary>();
    return new Map(Object.entries(data.impactSummariesByWorkRequestId));
  }, [data?.impactSummariesByWorkRequestId]);

  // Filter issues by section and severity (client-side)
  // Uses allIssues (not topIssues) for complete drilldown views
  // Phase P: Decorate issues with impact data for Impact column
  const filteredIssues = useMemo(() => {
    if (!data?.allIssues) return [];

    // Filter by section's issue types
    let issues = data.allIssues.filter((issue) =>
      config.issueTypes.includes(issue.type)
    );

    // Filter by severity
    if (severityFilter !== "all") {
      const severityMap: Record<SeverityFilter, string> = {
        critical: "error",
        warning: "warning",
        info: "info",
        all: "",
      };
      const targetSeverity = severityMap[severityFilter];
      issues = issues.filter((issue) => issue.severity === targetSeverity);
    }

    // Phase P: Decorate issues with impact data
    const decoratedIssues = issues.map((issue) => {
      // Key extraction: Check if issue evidence contains workRequestId: string
      let impactBadge: string | undefined = undefined;
      let affectedCount: number | undefined = undefined;

      if (issue.evidence && typeof issue.evidence === "object" && "workRequestId" in issue.evidence) {
        const workRequestId = issue.evidence.workRequestId;
        if (typeof workRequestId === "string") {
          const impactSummary = impactSummaryByWorkRequestId.get(workRequestId);
          if (impactSummary) {
            // Build impact badge from summary
            if (impactSummary.highestSeverity) {
              impactBadge = impactSummary.highestSeverity;
            }
            affectedCount = impactSummary.totalCount;
          }
        }
      }

      return {
        ...issue,
        _impactData: impactBadge || affectedCount !== undefined
          ? { impactBadge, affectedCount }
          : null,
      };
    });

    return decoratedIssues;
  }, [data?.allIssues, config.issueTypes, severityFilter, impactSummaryByWorkRequestId]);

  // Compute counts
  const counts = useMemo(() => {
    if (!data?.allIssues) return { total: 0, critical: 0, warning: 0, info: 0 };

    const sectionIssues = data.allIssues.filter((issue) =>
      config.issueTypes.includes(issue.type)
    );

    return {
      total: sectionIssues.length,
      critical: sectionIssues.filter((i) => i.severity === "error").length,
      warning: sectionIssues.filter((i) => i.severity === "warning").length,
      info: sectionIssues.filter((i) => i.severity === "info").length,
    };
  }, [data?.allIssues, config.issueTypes]);

  // Build "View all in Issues" link with filters preserved
  const issuesPageLink = buildDrilldownIssuesLink(
    section,
    severityFilter !== "all" ? { severity: severityFilter } : undefined
  );

  // Loading state
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading issues...</span>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="py-6">
          <div className="text-center">
            <div className="text-red-600 dark:text-red-400 font-medium mb-2">
              Failed to load data
            </div>
            <div className="text-sm text-muted-foreground mb-4">{error}</div>
            <Button onClick={fetchData} variant="outline" size="sm">
              Try again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const Icon = config.icon;

  return (
    <div className="space-y-6">
      {/* Filters Row */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Time Window Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Time Window</Label>
              <Select value={preset} onValueChange={(v) => handlePresetChange(v as TimeWindowPreset)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="next7days">Next 7 days</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {preset === "custom" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Start (UTC)</Label>
                  <Input
                    type="datetime-local"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-[200px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">End (UTC)</Label>
                  <Input
                    type="datetime-local"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-[200px]"
                  />
                </div>
                <Button
                  onClick={handleApplyCustomDates}
                  disabled={!customStart || !customEnd || loading}
                  size="sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Apply"
                  )}
                </Button>
              </>
            )}

            {/* Severity Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Severity</Label>
              <Select value={severityFilter} onValueChange={(v) => handleSeverityChange(v as SeverityFilter)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({counts.total})</SelectItem>
                  <SelectItem value="critical">Critical ({counts.critical})</SelectItem>
                  <SelectItem value="warning">Warning ({counts.warning})</SelectItem>
                  <SelectItem value="info">Info ({counts.info})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Window Display */}
            <div className="ml-auto text-xs text-muted-foreground">
              {data.issueWindow.label}: {new Date(data.issueWindow.start).toLocaleDateString()} — {new Date(data.issueWindow.end).toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <div>
            <span className="text-lg font-semibold">{filteredIssues.length}</span>
            <span className="text-muted-foreground ml-1.5">
              {filteredIssues.length === 1 ? "issue" : "issues"}
            </span>
          </div>
          {severityFilter !== "all" && (
            <Badge variant="secondary" className="text-xs">
              {severityFilter} only
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link href={config.primaryLink}>
            <Button variant="outline" size="sm">
              View {config.label}
              <ExternalLink className="ml-1.5 h-3 w-3" />
            </Button>
          </Link>
          <Link href={issuesPageLink}>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              View all in Issues
              <ExternalLink className="ml-1.5 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Issues Table */}
      <IntelligenceIssuesTable
        issues={filteredIssues}
        section={section}
        currentSeverityFilter={severityFilter !== "all" ? severityFilter : undefined}
      />
    </div>
  );
}
