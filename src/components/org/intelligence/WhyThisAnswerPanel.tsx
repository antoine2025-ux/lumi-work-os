"use client";

/**
 * Why This Answer Panel
 *
 * Collapsible panel showing responseMeta, issueWindow, thresholds, dataAssumptions.
 * Provides full explainability for Intelligence landing.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Info, Clock, Gauge, FileText, RefreshCw } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { SerializedIssueWindow, IntelligenceResponseMeta } from "@/lib/org/intelligence/types";
import type { CapacityThresholds } from "@/lib/org/deriveIssues";

type Props = {
  issueWindow: SerializedIssueWindow;
  thresholds: CapacityThresholds & { issueWindowDays: number };
  responseMeta: IntelligenceResponseMeta;
};

export function WhyThisAnswerPanel({ issueWindow, thresholds, responseMeta }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="border-dashed">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Why this answer?</CardTitle>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            {/* Response Meta */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <FileText className="h-3.5 w-3.5" />
                Response Metadata
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assumptions ID</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {responseMeta.assumptionsId}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Evidence Version</span>
                  <span className="font-mono">{responseMeta.evidenceVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Semantics Version</span>
                  <span className="font-mono">{responseMeta.semanticsVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Generated At</span>
                  <span className="font-mono text-xs">
                    {new Date(responseMeta.generatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Issue Resolution */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <RefreshCw className="h-3.5 w-3.5" />
                Issue Resolution
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-foreground mb-1">Why this exists</div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Issues are derived from canonical rules (ownership, capacity, work alignment, decision authority, impact visibility).
                    They represent structural risks or missing configuration, not judgments or approvals.
                  </p>
                </div>
                <div>
                  <div className="font-medium text-foreground mb-1">What removes it</div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Fix actions (mutations) that address the root cause remove issues immediately.
                    For example, assigning an owner removes an &quot;unowned&quot; issue; resolving a capacity conflict removes the conflict issue.
                  </p>
                </div>
                <div>
                  <div className="font-medium text-foreground mb-1">Response generated at</div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">Generated at</span>
                    <span className="font-mono text-xs">
                      {new Date(responseMeta.generatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Issue Window */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Clock className="h-3.5 w-3.5" />
                Issue Window
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Label</span>
                  <span>{issueWindow.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start</span>
                  <span className="font-mono text-xs">
                    {new Date(issueWindow.start).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End</span>
                  <span className="font-mono text-xs">
                    {new Date(issueWindow.end).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Thresholds */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Gauge className="h-3.5 w-3.5" />
                Thresholds
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Low Capacity Hours</span>
                  <span className="font-mono">{thresholds.lowCapacityHoursThreshold}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Overallocation Threshold</span>
                  <span className="font-mono">{Math.round(thresholds.overallocationThreshold * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Min Capacity for Coverage</span>
                  <span className="font-mono">{thresholds.minCapacityForCoverage}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issue Window Days</span>
                  <span className="font-mono">{thresholds.issueWindowDays} days</span>
                </div>
              </div>
            </div>

            {/* Data Assumptions */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Data Assumptions
              </div>
              <div className="flex flex-wrap gap-1.5">
                {responseMeta.dataAssumptions.map((assumption) => (
                  <Badge key={assumption} variant="secondary" className="text-xs font-mono">
                    {assumption}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
