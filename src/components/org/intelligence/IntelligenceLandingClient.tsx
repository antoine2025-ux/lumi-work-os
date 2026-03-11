"use client";

/**
 * Intelligence Landing Client
 *
 * Main client component for the Intelligence landing page.
 * Manages time window selection, fetches data, and renders sections.
 *
 * Rule: Client renders only API output, no grouping logic.
 */

import { useState, useEffect, useCallback } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { IntelligenceLandingResult } from "@/lib/org/intelligence/types";
import { IntelligenceSummaryTiles } from "./IntelligenceSummaryTiles";
import { IntelligenceIssuesInbox } from "./IntelligenceIssuesInbox";
import { IntelligenceSectionCards } from "./IntelligenceSectionCards";
import { WhyThisAnswerPanel } from "./WhyThisAnswerPanel";
import { ExplainabilityPanel } from "@/components/org/explainability/ExplainabilityPanel";
import { mutationBus } from "@/lib/org/mutations/bus";
import { computeSummaries } from "@/lib/org/intelligence/computeSummaries";

type TimeWindowPreset = "next7days" | "custom";

type Props = {
  isAdmin: boolean;
};

export function IntelligenceLandingClient({ isAdmin }: Props) {
  // State
  const [data, setData] = useState<IntelligenceLandingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Time window state
  const [preset, setPreset] = useState<TimeWindowPreset>("next7days");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  // Resolution feedback state
  const [_resolvedCount, setResolvedCount] = useState(0);
  const [_lastResolvedAt, setLastResolvedAt] = useState<Date | null>(null);

  // Build query params based on preset
  const buildQueryParams = useCallback(() => {
    if (preset === "next7days") {
      return ""; // Use default window
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
      setError(err instanceof Error ? err.message : "Failed to load intelligence data");
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

          // Filter issues
          const updatedAllIssues = prev.allIssues.filter((i) => !resolvedKeys.has(i.issueKey));
          const updatedTopIssues = prev.topIssues.filter((i) => !resolvedKeys.has(i.issueKey));

          // Recompute summaries from filtered allIssues (not patching)
          const updatedSummaries = computeSummaries(updatedAllIssues);

          return {
            ...prev,
            topIssues: updatedTopIssues,
            allIssues: updatedAllIssues,
            summaries: updatedSummaries,
          };
        });
        // Update micro-feedback
        setResolvedCount(event.affectedIssues.resolved.length);
        setLastResolvedAt(new Date(event.resolvedAt));
      }
    });
    return unsubscribe;
  }, []);

  // Handle preset change
  const handlePresetChange = (value: TimeWindowPreset) => {
    setPreset(value);
    if (value === "next7days") {
      // Clear custom dates and refetch
      setCustomStart("");
      setCustomEnd("");
    }
  };

  // Handle custom date apply
  const handleApplyCustomDates = () => {
    if (customStart && customEnd) {
      fetchData();
    }
  };

  // Loading state
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading intelligence...</span>
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
              Failed to load intelligence data
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

  return (
    <div className="space-y-8">
      {/* Time Window Selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-4">
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

            <div className="ml-auto text-xs text-muted-foreground">
              {data.issueWindow.label}: {new Date(data.issueWindow.start).toLocaleDateString()} — {new Date(data.issueWindow.end).toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Tiles (Secondary) */}
      <IntelligenceSummaryTiles summaries={data.summaries} isAdmin={isAdmin} />

      {/* Phase P: High-Impact Work at Risk Tile */}
      {data.workRiskSummary && data.workRiskSummary.totalAtRisk > 0 && (
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <CardTitle className="text-sm font-medium">High-Impact Work at Risk</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">
                {data.workRiskSummary.totalAtRisk}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {data.workRiskSummary.highImpactOpenCount > 0 && (
                <div>{data.workRiskSummary.highImpactOpenCount} work request(s) with HIGH severity impacts</div>
              )}
              {data.workRiskSummary.blockedImpactCount > 0 && (
                <div>{data.workRiskSummary.blockedImpactCount} work request(s) with BLOCKED impacts</div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Link
                href="/org/intelligence/work"
                className="text-primary hover:underline"
              >
                View work drilldown
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Issues Inbox (Primary - What Needs Attention) */}
      <div className="space-y-2">
        <IntelligenceIssuesInbox issues={data.topIssues} />
      </div>

      {/* Section Cards (Secondary) */}
      <IntelligenceSectionCards summaries={data.summaries} isAdmin={isAdmin} />

      {/* Tertiary: Explainability Panels (reduced contrast, collapsed by default) */}
      <div className="space-y-4 opacity-60">
        {/* Why This Answer Panel (response metadata) */}
        <div className="border-white/5">
          <WhyThisAnswerPanel
            issueWindow={data.issueWindow}
            thresholds={data.thresholds}
            responseMeta={data.responseMeta}
          />
        </div>

        {/* Explainability Panel (if topIssues have explainability) */}
        {data.topIssues.some(issue => issue.explainability) && (
          <div className="space-y-2">
            {data.topIssues
              .filter(issue => issue.explainability)
              .slice(0, 3) // Show explainability for top 3 issues
              .map(issue => (
                <div key={issue.issueKey} className="border-white/5">
                  <ExplainabilityPanel
                    explainability={issue.explainability}
                    compact={true}
                  />
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
