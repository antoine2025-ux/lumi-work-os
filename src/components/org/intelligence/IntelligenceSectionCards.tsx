"use client";

/**
 * Intelligence Section Cards
 *
 * 6 section cards with counts and "View issues" links.
 * Covers: Ownership, Capacity, Work, Responsibility, Decisions, Impact.
 *
 * "View" links to drilldown page, "View issues" links to Issues page with filters.
 */

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ExternalLink,
  Lock,
} from "lucide-react";
import type { IntelligenceSummaries } from "@/lib/org/intelligence/types";
import {
  SECTION_CONFIG,
  SECTION_KEYS,
} from "@/lib/org/intelligence/sections";
import { cn } from "@/lib/utils";

type Props = {
  summaries: IntelligenceSummaries;
  isAdmin: boolean;
};

function SectionMetrics({
  summary,
}: {
  summary: IntelligenceSummaries[keyof IntelligenceSummaries];
}) {
  // Get specific metrics based on section
  const metrics: { label: string; value: number }[] = [];

  if ("conflicts" in summary) {
    if (summary.conflicts > 0) metrics.push({ label: "Conflicts", value: summary.conflicts });
    if (summary.unowned > 0) metrics.push({ label: "Unowned", value: summary.unowned });
  }
  if ("overallocated" in summary) {
    if (summary.overallocated > 0) metrics.push({ label: "Overallocated", value: summary.overallocated });
    if (summary.lowCapacity > 0) metrics.push({ label: "Low capacity", value: summary.lowCapacity });
    if (summary.noCover > 0) metrics.push({ label: "No cover", value: summary.noCover });
  }
  if ("notStaffable" in summary) {
    if (summary.notStaffable > 0) metrics.push({ label: "Not staffable", value: summary.notStaffable });
    if (summary.capacityGap > 0) metrics.push({ label: "Capacity gap", value: summary.capacityGap });
  }
  if ("unknown" in summary && "misaligned" in summary) {
    if (summary.unknown > 0) metrics.push({ label: "Unknown", value: summary.unknown });
    if (summary.misaligned > 0) metrics.push({ label: "Misaligned", value: summary.misaligned });
  }
  if ("missing" in summary && "unavailable" in summary) {
    if (summary.missing > 0) metrics.push({ label: "Missing", value: summary.missing });
    if (summary.unavailable > 0) metrics.push({ label: "Unavailable", value: summary.unavailable });
  }
  if ("undefined" in summary && "highImpact" in summary) {
    if (summary.undefined > 0) metrics.push({ label: "Undefined", value: summary.undefined });
    if (summary.highImpact > 0) metrics.push({ label: "High impact", value: summary.highImpact });
  }

  if (metrics.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {metrics.slice(0, 3).map((m) => (
        <Badge key={m.label} variant="secondary" className="text-xs">
          {m.label}: {m.value}
        </Badge>
      ))}
    </div>
  );
}

export function IntelligenceSectionCards({ summaries, isAdmin }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        By Category
      </h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SECTION_KEYS.map((sectionKey) => {
          const config = SECTION_CONFIG[sectionKey];
          const summary = summaries[sectionKey];
          const Icon = config.icon;
          const isAccessible = !config.requiresAdmin || isAdmin;
          const filterLink = `/org/issues?types=${config.issueTypes.join(",")}`;

          return (
            <Card
              key={sectionKey}
              className={cn(
                "transition-colors",
                summary.total > 0 && summary.critical > 0 && "border-red-500/30",
                summary.total > 0 && summary.critical === 0 && summary.warning > 0 && "border-amber-500/30"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">{config.label}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {config.requiresAdmin && !isAdmin && (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <Badge
                      variant={summary.total > 0 ? (summary.critical > 0 ? "destructive" : "secondary") : "outline"}
                      className="text-xs"
                    >
                      {summary.total}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="text-xs">
                  {config.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <SectionMetrics summary={summary} />

                <div className="flex items-center justify-between pt-2">
                  {isAccessible ? (
                    <Link href={config.drilldownLink}>
                      <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                        View
                        <ChevronRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground italic pl-2">
                      Admin only
                    </span>
                  )}

                  {summary.total > 0 && (
                    <Link href={filterLink}>
                      <Button variant="outline" size="sm" className="text-xs h-7 px-2">
                        View issues
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
