"use client";

/**
 * Project Health Card Component
 *
 * Displays project health metrics from ProjectHealthSnapshotV0.
 * Can be used in project detail pages, dashboards, and project lists.
 *
 * @see src/lib/loopbrain/contract/projectHealth.v0.ts
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type {
  ProjectHealthSnapshotV0,
  OverallHealthV0,
  TrendDirectionV0,
} from "@/lib/loopbrain/contract/projectHealth.v0";

// =============================================================================
// Types
// =============================================================================

interface ProjectHealthCardProps {
  projectId: string;
  className?: string;
  variant?: "compact" | "full";
  onHealthLoaded?: (snapshot: ProjectHealthSnapshotV0) => void;
}

interface HealthBadgeProps {
  health: OverallHealthV0;
  className?: string;
}

interface TrendIndicatorProps {
  direction: TrendDirectionV0;
  className?: string;
}

// =============================================================================
// Health Badge Component
// =============================================================================

function HealthBadge({ health, className }: HealthBadgeProps) {
  const colors: Record<OverallHealthV0, string> = {
    EXCELLENT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    GOOD: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    AT_RISK: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const labels: Record<OverallHealthV0, string> = {
    EXCELLENT: "Excellent",
    GOOD: "Good",
    AT_RISK: "At Risk",
    CRITICAL: "Critical",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colors[health],
        className
      )}
    >
      {labels[health]}
    </span>
  );
}

// =============================================================================
// Trend Indicator Component
// =============================================================================

function TrendIndicator({ direction, className }: TrendIndicatorProps) {
  const icons: Record<TrendDirectionV0, string> = {
    IMPROVING: "↑",
    STABLE: "→",
    DECLINING: "↓",
    VOLATILE: "↕",
  };

  const colors: Record<TrendDirectionV0, string> = {
    IMPROVING: "text-green-600 dark:text-green-400",
    STABLE: "text-gray-600 dark:text-gray-400",
    DECLINING: "text-red-600 dark:text-red-400",
    VOLATILE: "text-yellow-600 dark:text-yellow-400",
  };

  return (
    <span className={cn("font-medium", colors[direction], className)}>
      {icons[direction]}
    </span>
  );
}

// =============================================================================
// Progress Bar Component
// =============================================================================

function ProgressBar({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  label?: string;
  className?: string;
}) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>{label}</span>
          <span>
            {value}/{max} ({percentage}%)
          </span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-2 rounded-full bg-blue-600 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ProjectHealthCard({
  projectId,
  className,
  variant = "compact",
  onHealthLoaded,
}: ProjectHealthCardProps) {
  const [snapshot, setSnapshot] = useState<ProjectHealthSnapshotV0 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHealth() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/loopbrain/project-health?projectId=${projectId}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch project health");
        }

        const data = await response.json();
        setSnapshot(data);
        onHealthLoaded?.(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchHealth();
  }, [projectId, onHealthLoaded]);

  if (loading) {
    return (
      <div
        className={cn(
          "animate-pulse rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800",
          className
        )}
      >
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="mt-2 h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div
        className={cn(
          "rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400",
          className
        )}
      >
        Unable to load health metrics
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Health
            </span>
            <HealthBadge health={snapshot.summary.overallHealth} />
          </div>
          <TrendIndicator direction={snapshot.momentum.trendDirection} />
        </div>

        <div className="mt-3">
          <ProgressBar
            value={snapshot.progress.tasks.completed}
            max={snapshot.progress.tasks.total}
            label="Tasks"
          />
        </div>

        {snapshot.summary.activeRiskCount > 0 && (
          <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
            {snapshot.summary.activeRiskCount} active risk
            {snapshot.summary.activeRiskCount > 1 ? "s" : ""}
          </div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Project Health
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {snapshot.projectName}
          </p>
        </div>
        <HealthBadge health={snapshot.summary.overallHealth} />
      </div>

      {/* Health Score */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Health Score</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {Math.round(snapshot.summary.healthScore * 100)}%
          </span>
        </div>
        <div className="mt-1 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              snapshot.summary.healthScore >= 0.8
                ? "bg-green-500"
                : snapshot.summary.healthScore >= 0.6
                  ? "bg-blue-500"
                  : snapshot.summary.healthScore >= 0.4
                    ? "bg-yellow-500"
                    : "bg-red-500"
            )}
            style={{ width: `${snapshot.summary.healthScore * 100}%` }}
          />
        </div>
      </div>

      {/* Progress Section */}
      <div className="mt-6 space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Progress
        </h4>
        <ProgressBar
          value={snapshot.progress.tasks.completed}
          max={snapshot.progress.tasks.total}
          label="Tasks"
        />
        <ProgressBar
          value={snapshot.progress.epics.completed}
          max={snapshot.progress.epics.total}
          label="Epics"
        />
        <ProgressBar
          value={snapshot.progress.milestones.completed}
          max={snapshot.progress.milestones.total}
          label="Milestones"
        />
      </div>

      {/* Velocity Section */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Velocity
        </h4>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Tasks/Week
            </div>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {snapshot.velocity.throughput.tasksPerWeek}
              </span>
              <TrendIndicator direction={snapshot.momentum.trendDirection} />
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Avg Cycle Time
            </div>
            <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {snapshot.velocity.cycleTime.avgDays}d
            </div>
          </div>
        </div>
      </div>

      {/* Risks & Blockers */}
      {(snapshot.summary.activeRiskCount > 0 ||
        snapshot.summary.activeBlockerCount > 0) && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Issues
          </h4>
          <div className="mt-2 space-y-2">
            {snapshot.risks.slice(0, 3).map((risk) => (
              <div
                key={risk.id}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  risk.severity === "CRITICAL"
                    ? "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200"
                    : risk.severity === "HIGH"
                      ? "bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200"
                      : "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                )}
              >
                {risk.description}
              </div>
            ))}
            {snapshot.blockers.slice(0, 2).map((blocker) => (
              <div
                key={blocker.id}
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200"
              >
                {blocker.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              snapshot.summary.onTrack ? "bg-green-500" : "bg-yellow-500"
            )}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {snapshot.summary.onTrack ? "On Track" : "Needs Attention"}
          </span>
        </div>
        {snapshot.summary.daysToNextMilestone !== null && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {snapshot.summary.daysToNextMilestone} days to next milestone
          </span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Hook for Custom Usage
// =============================================================================

export function useProjectHealth(projectId: string) {
  const [snapshot, setSnapshot] = useState<ProjectHealthSnapshotV0 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHealth() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/loopbrain/project-health?projectId=${projectId}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch project health");
        }

        const data = await response.json();
        setSnapshot(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchHealth();
  }, [projectId]);

  return { snapshot, loading, error };
}

export default ProjectHealthCard;
