"use client";

import Link from "next/link";
import { Building, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getDepartmentAccent } from "@/components/org/structure/accent-colors";
import { getInitials } from "@/components/org/structure/utils";

export interface DepartmentListRowProps {
  id: string;
  name: string;
  leadName?: string | null;
  leadInitials?: string;
  teamsCount: number;
  peopleCount: number;
  departmentSlug?: string;
  href: string;
  accentIndex?: number;
}

/**
 * Shared department row component for List views
 * Premium SaaS-quality navigation view matching Organization Structure → List view
 */
export function DepartmentListRow({
  name,
  leadName,
  leadInitials,
  teamsCount,
  peopleCount,
  href,
  accentIndex = 0,
}: DepartmentListRowProps) {
  const accent = getDepartmentAccent(accentIndex);
  const initials = leadInitials || (leadName ? getInitials(leadName) : null);

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex w-full flex-wrap md:flex-nowrap items-center justify-between gap-4 rounded-3xl border border-border/50 bg-gradient-to-b from-[#020617] to-slate-950/80 px-6 py-4 transition-all duration-200",
        "hover:-translate-y-[1px] hover:border-border/60 hover:shadow-[0_0_40px_rgba(0,0,0,0.40)] hover:bg-white/5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      )}
    >
      {/* Left cluster: icon + text stack */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Department icon with accent color */}
        <div
          className={cn(
            "flex-shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center border",
            accent.iconBg,
            accent.iconBorder,
            accent.iconGlow
          )}
        >
          <Building className="h-5 w-5 text-blue-100" />
        </div>

        {/* Text column: name + lead */}
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          {/* Department name */}
          <span className="text-lg font-semibold text-foreground truncate">
            {name}
          </span>

          {/* Lead line with avatar */}
          {leadName && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarFallback className="bg-slate-700/50 border border-slate-600/50 text-[10px] text-muted-foreground">
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                Lead: {leadName}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Middle cluster: pills for teams + people - wraps on small screens */}
      <div className="flex items-center gap-2 flex-shrink-0 order-3 md:order-2 w-full md:w-auto">
        <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/80 backdrop-blur-sm px-3 py-1 text-xs font-medium text-muted-foreground">
          {teamsCount} {teamsCount === 1 ? "team" : "teams"}
        </span>
        {peopleCount > 0 && (
          <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/80 backdrop-blur-sm px-3 py-1 text-xs font-medium text-muted-foreground">
            {peopleCount} {peopleCount === 1 ? "person" : "people"}
          </span>
        )}
      </div>

      {/* Right side CTA */}
      <div className="flex-shrink-0 order-2 md:order-3 md:ml-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 group-hover:text-blue-300 transition-all duration-150 group-hover:gap-2">
          Open
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

