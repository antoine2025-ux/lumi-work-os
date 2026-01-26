"use client";

/**
 * Intelligence Summary Tiles
 *
 * 4 top tiles showing Ownership, Capacity, Work, Responsibility.
 * Premium styling with severity indicators.
 *
 * "View" links to drilldown page, "Go to {label}" links to fix surface.
 */

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle } from "lucide-react";
import type { IntelligenceSummaries } from "@/lib/org/intelligence/types";
import {
  SECTION_CONFIG,
  TILE_SECTION_KEYS,
} from "@/lib/org/intelligence/sections";
import { cn } from "@/lib/utils";

type Props = {
  summaries: IntelligenceSummaries;
  isAdmin: boolean;
};

function SeverityIndicator({ critical, warning }: { critical: number; warning: number }) {
  if (critical > 0) {
    return (
      <div className="flex items-center gap-1 text-red-500">
        <AlertCircle className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">{critical} critical</span>
      </div>
    );
  }
  if (warning > 0) {
    return (
      <div className="flex items-center gap-1 text-amber-500">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">{warning} warning</span>
      </div>
    );
  }
  return (
    <div className="text-xs text-muted-foreground">
      No issues
    </div>
  );
}

export function IntelligenceSummaryTiles({ summaries, isAdmin }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {TILE_SECTION_KEYS.map((sectionKey) => {
        const config = SECTION_CONFIG[sectionKey];
        const summary = summaries[sectionKey];
        const Icon = config.icon;
        const isAccessible = !config.requiresAdmin || isAdmin;
        const filterLink = `/org/issues?types=${config.issueTypes.join(",")}`;

        return (
          <Card
            key={sectionKey}
            className={cn(
              "relative transition-colors",
              summary.total > 0 && "border-l-4",
              summary.critical > 0 && "border-l-red-500",
              summary.critical === 0 && summary.warning > 0 && "border-l-amber-500"
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                </div>
                <Badge variant={summary.total > 0 ? "secondary" : "outline"} className="text-xs">
                  {summary.total}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <SeverityIndicator critical={summary.critical} warning={summary.warning} />
              
              <div className="flex items-center gap-2 text-xs">
                {isAccessible ? (
                  <Link
                    href={config.drilldownLink}
                    className="text-primary hover:underline"
                  >
                    View
                  </Link>
                ) : (
                  <span className="text-muted-foreground italic">Ask admin</span>
                )}
                {summary.total > 0 && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <Link
                      href={filterLink}
                      className="text-muted-foreground hover:text-primary hover:underline"
                    >
                      View issues
                    </Link>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
