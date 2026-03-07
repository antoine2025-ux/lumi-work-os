import { Progress } from "@/components/ui/progress";
import { Briefcase } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  hoursAllocated: number;
  role: string;
}

const PROJECT_DOT_COLORS = ["bg-blue-500", "bg-emerald-500", "bg-amber-500"] as const;

interface CurrentWorkloadSectionProps {
  totalCapacity: number;
  allocatedHours: number;
  availableHours: number;
  utilizationPct: number;
  projects: Project[];
  workspaceSlug?: string;
}

export function CurrentWorkloadSection({
  totalCapacity,
  allocatedHours,
  availableHours,
  utilizationPct,
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

  return (
    <div className="rounded-lg border border-border/50 bg-card/80 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Current Workload
      </h3>
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
          <span>Allocated: {allocatedHours}h</span>
          <span
            className={
              availableHours < 0 ? "text-red-500 font-medium" : "text-muted-foreground"
            }
          >
            Available: {availableHours}h
          </span>
        </div>

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
