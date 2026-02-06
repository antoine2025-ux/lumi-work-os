"use client";

/**
 * CapacitySummaryCard
 *
 * Displays capacity coverage and issue counts.
 * Used at the top of People list and potentially in Overview.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Users, AlertTriangle, ArrowDown } from "lucide-react";

type Props = {
  configured: number;
  total: number;
  coveragePct: number;
  overloadedCount: number;
  underutilizedCount: number;
};

export function CapacitySummaryCard({
  configured,
  total,
  coveragePct,
  overloadedCount,
  underutilizedCount,
}: Props) {
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Capacity coverage:</span>
            <span className="font-medium">
              {configured}/{total} people ({coveragePct}%)
            </span>
          </div>

          {overloadedCount > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-orange-600 dark:text-orange-400 font-medium">
                {overloadedCount} overloaded
              </span>
            </div>
          )}

          {underutilizedCount > 0 && (
            <div className="flex items-center gap-1.5">
              <ArrowDown className="h-3.5 w-3.5 text-yellow-500" />
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                {underutilizedCount} underutilized
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
