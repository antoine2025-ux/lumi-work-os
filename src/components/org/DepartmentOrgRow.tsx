"use client";

import Link from "next/link";
import { Building, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getDepartmentAccent } from "@/components/org/structure/accent-colors";
import { getInitials } from "@/components/org/structure/utils";

export interface DepartmentOrgRowProps {
  id: string;
  name: string;
  teamsCount: number;
  peopleCount: number;
  leadName?: string | null;
  leadInitials?: string;
  parentName?: string | null;
  hrefStructure: string;
  hrefPeople?: string;
  accentIndex?: number;
}

/**
 * Premium department row component for Org chart
 * At-a-glance navigation map showing ownership, size, and hierarchy
 */
export function DepartmentOrgRow({
  id,
  name,
  teamsCount,
  peopleCount,
  leadName,
  leadInitials,
  parentName,
  hrefStructure,
  hrefPeople,
  accentIndex = 0,
}: DepartmentOrgRowProps) {
  const accent = getDepartmentAccent(accentIndex);
  const initials = leadInitials || (leadName ? getInitials(leadName) : null);

  return (
    <Link
      href={hrefStructure}
      className={cn(
        "group relative flex w-full items-start md:items-center gap-4 md:gap-6 rounded-3xl",
        "bg-gradient-to-b from-[#020617] to-slate-950/80 border border-slate-800/50",
        "px-6 py-4 md:px-8 md:py-5",
        "transition-all duration-200",
        "hover:-translate-y-[1px] hover:border-blue-500/60 hover:bg-white/5 hover:shadow-[0_0_40px_rgba(0,0,0,0.40)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-0"
      )}
    >
      {/* Left cluster: icon + text stack */}
      <div className="flex items-start gap-4 md:gap-5 flex-1 min-w-0 pt-0.5 md:pt-0">
        {/* Department icon with accent color - 56x56 (h-14 w-14) */}
        <div
          className={cn(
            "flex-shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center border",
            accent.iconBg,
            accent.iconBorder,
            accent.iconGlow
          )}
        >
          <Building className="h-6 w-6 text-blue-100" />
        </div>

        {/* Text column: name + parent/reports to */}
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          {/* Department name */}
          <span className="text-lg md:text-xl font-semibold text-slate-100 truncate leading-tight">
            {name}
          </span>

          {/* Parent/reports to line */}
          {parentName && (
            <span className="text-xs md:text-sm text-slate-400 leading-tight">
              Reports to {parentName}
            </span>
          )}
        </div>
      </div>

      {/* Middle cluster: Lead info - single line, aligned with department name baseline */}
      {leadName ? (
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0 pt-0.5 md:pt-0">
          {/* Lead avatar - 32x32 */}
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-slate-700/80 border border-slate-600/50 text-xs font-semibold text-slate-300">
              {initials || "?"}
            </AvatarFallback>
          </Avatar>
          {/* Lead name - single line, aligned with department name */}
          <span className="text-xs md:text-sm text-slate-300/70 whitespace-nowrap leading-tight">
            Lead: {leadName}
          </span>
        </div>
      ) : (
        <div className="flex items-center min-w-0 flex-shrink-0 pt-0.5 md:pt-0">
          <span className="text-xs text-slate-500 whitespace-nowrap leading-tight">No lead assigned yet</span>
        </div>
      )}

      {/* Right cluster: Metrics + CTA */}
      <div className="ml-auto flex items-center gap-3 md:gap-4 flex-shrink-0">
        {/* Metrics pills - always show, even when 0 */}
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-full border border-slate-700/60 bg-slate-800/60 px-3 md:px-4 py-1 text-xs md:text-sm text-slate-300/80 whitespace-nowrap"
            title={`${teamsCount} ${teamsCount === 1 ? "team" : "teams"} in this department`}
          >
            {teamsCount} {teamsCount === 1 ? "team" : "teams"}
          </span>
          <span
            className="inline-flex items-center rounded-full border border-slate-700/60 bg-slate-800/60 px-3 md:px-4 py-1 text-xs md:text-sm text-slate-300/80 whitespace-nowrap"
            title={`${peopleCount} ${peopleCount === 1 ? "person" : "people"} assigned to this department`}
          >
            {peopleCount} {peopleCount === 1 ? "person" : "people"}
          </span>
        </div>

        {/* Primary CTA */}
        <div
          className="inline-flex items-center gap-2 text-xs md:text-sm font-medium text-blue-400 group-hover:text-blue-300 transition-all duration-150 group-hover:gap-2.5 whitespace-nowrap"
          title="Open department in Org structure"
        >
          Open
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

