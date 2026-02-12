import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Briefcase, Clock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  hoursAllocated: number;
  role: string;
}

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
    <Card className="border-[#1e293b] bg-[#0B1220]">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-slate-50">
          <TrendingUp className="h-5 w-5" />
          Current Workload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-200">
              Weekly Capacity
            </span>
            <span
              className={cn(
                "text-2xl font-bold",
                getUtilizationColor(utilizationPct)
              )}
            >
              {utilizationPct}%
            </span>
          </div>

          <Progress
            value={Math.min(utilizationPct, 100)}
            className="h-3 bg-slate-800"
          />

          <div className="flex items-center justify-between text-sm text-slate-400 gap-2 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              {allocatedHours}h allocated
            </span>
            <span className="text-slate-500">•</span>
            <span>{totalCapacity}h total</span>
            <span className="text-slate-500">•</span>
            <span
              className={
                availableHours < 0 ? "text-red-500 font-medium" : "text-slate-400"
              }
            >
              {availableHours}h available
            </span>
          </div>
        </div>

        {projects.length > 0 ? (
          <div className="space-y-3">
            <div className="text-sm font-medium flex items-center gap-2 text-slate-200">
              <Briefcase className="h-4 w-4" />
              Active Projects ({projects.length})
            </div>
            <div className="space-y-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={projectHref(project.id)}
                  className="block p-3 rounded-lg border border-[#1e293b] bg-[#020617] hover:bg-[#0f172a] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate text-slate-200">
                        {project.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {project.hoursAllocated}h/week
                      </div>
                    </div>
                    <Badge
                      variant={project.role === "owner" ? "default" : "secondary"}
                      className="shrink-0 border-slate-600 text-slate-400"
                    >
                      {project.role === "owner" ? "Owner" : "Member"}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-slate-500">
            <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No active projects</p>
          </div>
        )}

        {utilizationPct > 100 && (
          <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/50">
            <p className="text-sm text-red-200">
              You are over capacity by {Math.round(utilizationPct - 100)}%.
              Consider discussing workload with your manager.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
