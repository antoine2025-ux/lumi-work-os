"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type OrgChartDepartment = {
  id: string;
  name: string;
  type: "top-level" | "sub-department";
  accentColor?: string;
  accentIndex?: number;
  teamsCount: number;
  peopleCount: number;
  // Lead metadata (for layout + AI)
  lead: {
    id: string;
    initials: string;
    name: string;
    title?: string; // e.g. "VP Engineering"
    avatarUrl?: string | null;
  } | null;
  // Extra metadata for Loopbrain / future features
  parentDepartmentId?: string | null;
  teamIds?: string[];
  peopleIds?: string[];
  description?: string;
  lastUpdated?: string; // ISO date
};

export interface OrgChartDepartmentRowProps {
  department: OrgChartDepartment;
  onOpenStructure?: (deptId: string) => void;
  onOpenPeople?: (deptId: string) => void;
  hrefStructure?: string;
  hrefPeople?: string;
  isFirst?: boolean; // For styling the first row differently
}

/**
 * Premium department row component for Org chart
 * Enterprise-grade navigation surface matching Structure/List views
 */
export function OrgChartDepartmentRow({
  department,
  onOpenPeople,
  hrefStructure,
  isFirst: _isFirst = false,
}: OrgChartDepartmentRowProps) {
  const {
    name,
    teamsCount,
    peopleCount,
    lead,
    accentIndex = 0,
  } = department;

  const structureHref = hrefStructure ?? `/org/structure?department=${department.id}`;

  // Extract gradient colors from accent for CSS variables
  // Increased saturation by 15% for richer colors
  const getGradientVars = () => {
    const accentColors = [
      { from: "rgba(20, 184, 166, 0.35)", via: "rgba(6, 182, 212, 0.29)", to: "rgba(20, 184, 166, 0.35)", glow: "rgba(20, 184, 166, 0.15)" }, // teal
      { from: "rgba(59, 130, 246, 0.46)", via: "rgba(14, 165, 233, 0.35)", to: "rgba(37, 99, 235, 0.46)", glow: "rgba(59, 130, 246, 0.15)" }, // blue
      { from: "rgba(236, 72, 153, 0.35)", via: "rgba(244, 63, 94, 0.29)", to: "rgba(217, 70, 239, 0.35)", glow: "rgba(236, 72, 153, 0.15)" }, // pink
      { from: "rgba(168, 85, 247, 0.35)", via: "rgba(139, 92, 246, 0.29)", to: "rgba(147, 51, 234, 0.35)", glow: "rgba(168, 85, 247, 0.15)" }, // purple
      { from: "rgba(245, 158, 11, 0.35)", via: "rgba(234, 179, 8, 0.29)", to: "rgba(249, 115, 22, 0.35)", glow: "rgba(245, 158, 11, 0.15)" }, // amber
      { from: "rgba(34, 197, 94, 0.35)", via: "rgba(16, 185, 129, 0.29)", to: "rgba(22, 163, 74, 0.35)", glow: "rgba(34, 197, 94, 0.15)" }, // green
      { from: "rgba(6, 182, 212, 0.35)", via: "rgba(14, 165, 233, 0.29)", to: "rgba(8, 145, 178, 0.35)", glow: "rgba(6, 182, 212, 0.15)" }, // cyan
    ];
    return accentColors[accentIndex % accentColors.length];
  };

  const gradientVars = getGradientVars();

  const handlePeopleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenPeople?.(department.id);
  };

  return (
    <Link
      href={structureHref}
      className={cn(
        "group block rounded-3xl bg-card/65 shadow-[0_20px_60px_rgba(0,0,0,0.60)]",
        "border border-white/5 hover:border-white/12 transition-colors",
        "hover:bg-card/68 hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-0"
      )}
    >
      <div className="flex items-center justify-between gap-6 px-8 py-6">
        {/* LEFT — IDENTITY: icon + header */}
        <div className="flex items-center flex-1 min-w-0">
          {/* Department icon with gradient */}
          <div
            className="flex-shrink-0 flex h-[70px] w-[70px] items-center justify-center rounded-3xl bg-gradient-to-br from-[var(--dept-from)] via-[var(--dept-via)] to-[var(--dept-to)] border border-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.65),inset_0_2px_8px_rgba(0,0,0,0.3)]"
            style={{
              "--dept-from": gradientVars.from,
              "--dept-via": gradientVars.via,
              "--dept-to": gradientVars.to,
            } as React.CSSProperties}
          >
            <Building2 className="h-8 w-8 text-foreground" />
          </div>

          {/* Header block: name + lead info */}
          <div className="ml-4 flex flex-col gap-1">
            <div className="text-lg font-semibold text-foreground">
              {name}
            </div>

            {lead ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Avatar className="h-7 w-7 text-xs">
                  <AvatarFallback className="bg-slate-700/80 text-muted-foreground/80">
                    {lead.initials}
                  </AvatarFallback>
                  {lead.avatarUrl && (
                    <AvatarImage src={lead.avatarUrl} alt={lead.name} />
                  )}
                </Avatar>

                <span className="font-medium text-foreground">
                  {lead.name}
                </span>

                <span className="text-xs md:text-sm text-muted-foreground">· Department lead</span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No leader assigned
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — METRICS & ACTIONS */}
        <div className="flex items-center gap-3 md:gap-4 text-sm flex-shrink-0">
          <span className="rounded-full bg-white/3 px-4 py-1 text-muted-foreground">
            {teamsCount} {teamsCount === 1 ? "team" : "teams"}
          </span>

          <span className="rounded-full bg-white/3 px-4 py-1 text-muted-foreground">
            {peopleCount} {peopleCount === 1 ? "person" : "people"}
          </span>

          <div className="hidden md:flex h-4 w-px bg-white/8"></div>

          <span className="text-primary text-sm font-medium inline-flex items-center gap-1 pointer-events-none">
            View structure <span aria-hidden>→</span>
          </span>

          <button
            type="button"
            onClick={handlePeopleClick}
            className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View people
          </button>
        </div>
      </div>
    </Link>
  );
}

