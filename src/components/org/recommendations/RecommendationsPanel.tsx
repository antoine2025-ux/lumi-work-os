/**
 * Recommendations Panel
 *
 * Displays Phase R AI-driven recommendations for org health improvements.
 * Supports loading, empty, error, and success states.
 *
 * Features:
 * - Severity badges (critical/warning/info)
 * - Category grouping
 * - Primary action links
 * - Graceful error handling (doesn't block Overview)
 */

"use client";

import Link from "next/link";
import { ChevronRight, AlertTriangle, Info, AlertCircle, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { OrgReasoningRecommendation } from "@/components/org/api";

// ============================================================================
// Types
// ============================================================================

export type RecommendationsPanelProps = {
  recommendations: OrgReasoningRecommendation[] | null;
  isLoading: boolean;
  error?: Error | null;
  /** Optional: show "View all" link */
  showViewAll?: boolean;
};

// ============================================================================
// Severity Badge
// ============================================================================

function SeverityBadge({ severity }: { severity: "info" | "warning" | "critical" }) {
  const variants = {
    critical: {
      className: "bg-red-500/20 text-red-400 border-red-500/30",
      icon: AlertCircle,
    },
    warning: {
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      icon: AlertTriangle,
    },
    info: {
      className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      icon: Info,
    },
  };

  const variant = variants[severity];
  const Icon = variant.icon;

  return (
    <Badge variant="outline" className={cn("gap-1 text-xs", variant.className)}>
      <Icon className="h-3 w-3" />
      {severity}
    </Badge>
  );
}

// ============================================================================
// Category Badge
// ============================================================================

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    ownership: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    people: "bg-green-500/20 text-green-400 border-green-500/30",
    structure: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    capacity: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  };

  return (
    <Badge variant="outline" className={cn("text-xs", colors[category] ?? "")}>
      {category}
    </Badge>
  );
}

// ============================================================================
// Recommendation Card
// ============================================================================

function RecommendationCard({ rec }: { rec: OrgReasoningRecommendation }) {
  // Guard against empty actions array
  const primaryAction = rec.actions?.length > 0
    ? (rec.actions.find((a) => a.primary) ?? rec.actions[0])
    : null;

  // Only render link if action exists and has valid href
  const canRenderAction = primaryAction?.href;

  return (
    <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <SeverityBadge severity={rec.severity} />
              <CategoryBadge category={rec.category} />
            </div>
            <h4 className="text-sm font-medium text-slate-100 mb-1">{rec.title}</h4>
            <p className="text-xs text-slate-400 line-clamp-2">{rec.summary}</p>
          </div>
          {canRenderAction && (
            <Link
              href={primaryAction.href}
              className={cn(
                "flex items-center gap-1 text-xs font-medium whitespace-nowrap",
                "text-blue-400 hover:text-blue-300 transition-colors"
              )}
            >
              {primaryAction.label}
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Loading State
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-3/4 mb-1" />
                <Skeleton className="h-3 w-full" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState() {
  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardContent className="p-6 text-center">
        <Lightbulb className="h-8 w-8 text-slate-600 mx-auto mb-3" />
        <h4 className="text-sm font-medium text-slate-300 mb-1">No recommendations</h4>
        <p className="text-xs text-slate-500">
          Your organization looks healthy! We&apos;ll surface recommendations when we detect opportunities.
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Error State
// ============================================================================

function ErrorState({ error }: { error: Error }) {
  // Don't expose raw error messages in production - could leak internal details
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <Card className="bg-slate-900/50 border-red-900/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-red-400 mb-1">
              Unable to load recommendations
            </h4>
            <p className="text-xs text-slate-500">
              {isDev && error.message ? error.message : "Please try again later."}
            </p>
            {isDev && error.stack && (
              <details className="mt-2">
                <summary className="text-xs text-slate-400 cursor-pointer">Error details</summary>
                <pre className="text-xs text-slate-500 mt-1 overflow-auto max-h-32">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function RecommendationsPanel({
  recommendations,
  isLoading,
  error,
  showViewAll = true,
}: RecommendationsPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <CardHeader className="p-0">
          <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            Recommendations
          </CardTitle>
        </CardHeader>
        {showViewAll && recommendations && recommendations.length > 0 && (
          <Link
            href="/org/recommendations"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            View all
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {isLoading && <LoadingSkeleton />}

      {error && !isLoading && <ErrorState error={error} />}

      {!isLoading && !error && recommendations && recommendations.length === 0 && (
        <EmptyState />
      )}

      {!isLoading && !error && recommendations && recommendations.length > 0 && (
        <div className="space-y-2">
          {recommendations.map((rec, index) => {
            // Add divider when severity changes (reinforces "top = most important")
            const prevSeverity = index > 0 ? recommendations[index - 1].severity : null;
            const severityChanged = prevSeverity !== null && prevSeverity !== rec.severity;

            return (
              <div key={rec.code}>
                {severityChanged && (
                  <div className="border-t border-slate-800 my-3" />
                )}
                <RecommendationCard rec={rec} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RecommendationsPanel;
