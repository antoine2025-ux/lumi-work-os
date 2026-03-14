import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Briefcase } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CapacitySnapshotStatus } from "@/lib/org/capacity/status";

interface Project {
  id: string;
  name: string;
  hoursAllocated: number;
  taskCount?: number;
  role: string | null;
}

const PROJECT_DOT_COLORS = ["bg-blue-500", "bg-emerald-500", "bg-amber-500"] as const;

const STATUS_BADGE: Record<CapacitySnapshotStatus, { label: string; className: string }> = {
  HEALTHY: { label: "Healthy", className: "border-emerald-500/50 bg-emerald-500/20 text-emerald-300" },
  AT_RISK: { label: "At Risk", className: "border-amber-500/50 bg-amber-500/20 text-amber-300" },
  OVERALLOCATED: { label: "Over Capacity", className: "border-red-500/50 bg-red-500/20 text-red-300" },
  UNDERUTILIZED: { label: "Underutilized", className: "border-slate-500/50 bg-slate-500/20 text-slate-300" },
  UNAVAILABLE: { label: "Unavailable", className: "border-slate-500/50 bg-slate-500/20 text-slate-400" },
};

interface CurrentWorkloadSectionProps {
  totalCapacity: number;
  allocatedHours: number;
  availableHours: number;
  utilizationPct: number;
  meetingHours?: number;
  timeOffHours?: number;
  effectiveHours?: number;
  snapshotStatus?: CapacitySnapshotStatus;
  projects: Project[];
  workspaceSlug?: string;
}

export function CurrentWorkloadSection({
  totalCapacity,
  allocatedHours,
  availableHours,
  utilizationPct,
  meetingHours,
  timeOffHours,
  effectiveHours,
  snapshotStatus,
  projects,
  workspaceSlug,
}: CurrentWorkloadSectionProps) {
  const getUtilizationColor = (pct: number) => {
    if (pct > 100) return "text-red-500";
    if (pct > 80) return "text-amber-400";
    return "text-emerald-400";
  };

  const projectHref = (projectId: string) =>
    workspaceSlug ? `/w/${workspaceSlug}/projects/${projectId}` : `/projects/${projectId}`;

  const badge = snapshotStatus ? STATUS_BADGE[snapshotStatus] : null;

  return (
    <div className="rounded-lg border border-border/50 bg-card/80 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Current Workload
        </h3>
        {badge && (
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", badge.className)}>
            {badge.label}
          </Badge>
        )}
      </div>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "text-3xl font-bold text-foreground",
              getUtilizationColor(utilizationPct)
            )}
          >
            {utilizationPct}%
          </span>
          <span className="text-xs text-muted-foreground shrink-0 pt-1">
            {allocatedHours}h / {totalCapacity}h weekly
          </span>
        </div>

        <Progress
          value={Math.min(utilizationPct, 100)}
          className="h-2 bg-slate-700/80 [&>div]:bg-blue-500"
        />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Committed: {allocatedHours}h</span>
          <span
            className={
              availableHours < 0 ? "text-red-500 font-medium" : "text-muted-foreground"
            }
          >
            Available: {availableHours}h
          </span>
        </div>

        {/* V2 capacity breakdown */}
        {(meetingHours != null || timeOffHours != null || effectiveHours != null) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground border-t border-border/30 pt-2">
            {meetingHours != null && meetingHours > 0 && (
              <span>Meetings: {meetingHours}h</span>
            )}
            {timeOffHours != null && timeOffHours > 0 && (
              <span>Time off: {timeOffHours}h</span>
            )}
            {effectiveHours != null && (
              <span>Effective: {effectiveHours}h</span>
            )}
          </div>
        )}

        {projects.length > 0 ? (
          <div className="pt-2 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Projects
            </p>
            <div className="space-y-1.5">
              {projects.map((project, i) => (
                <Link
                  key={project.id}
                  href={projectHref(project.id)}
                  className="flex items-center justify-between gap-2 py-1.5 rounded hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        PROJECT_DOT_COLORS[i % PROJECT_DOT_COLORS.length]
                      )}
                    />
                    <span className="text-sm font-medium truncate text-foreground">
                      {project.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {project.hoursAllocated}h/wk
                    {project.taskCount != null && (
                      <span className="ml-1 text-muted-foreground/70">
                        ({project.taskCount} {project.taskCount === 1 ? "task" : "tasks"})
                      </span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-muted-foreground">
            <Briefcase className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
            <p>No active projects</p>
          </div>
        )}

        {utilizationPct > 100 && (
          <div className="p-2 rounded bg-red-950/40">
            <p className="text-xs text-red-200">
              Over capacity by {Math.round(utilizationPct - 100)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
