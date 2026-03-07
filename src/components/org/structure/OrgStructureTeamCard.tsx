"use client";

import { ArrowRight, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { OrgStructureTeam } from "./normalized-types";

type OrgStructureTeamCardProps = {
  team: OrgStructureTeam;
  className?: string;
  variant?: "list" | "tree";
};

/**
 * Shared team card component used in both List and Tree views
 * Premium styling with people count and "Open" link
 * Tree view: icon, team name, people pill, and CTA only (no lead info)
 * List view: includes lead avatar and name
 */
export function OrgStructureTeamCard({
  team,
  className,
  variant = "list",
}: OrgStructureTeamCardProps) {
  const isTree = variant === "tree";

  if (isTree) {
    // Tree view: clean layout with icon, name, people pill, and CTA only
    return (
      <div
        className={cn(
          "group flex h-full flex-col rounded-3xl border border-white/5 bg-background/40 p-3.5 shadow-[0_0_40px_rgba(0,0,0,0.45)] transition-all duration-150 ease-out",
          "hover:scale-[1.01] hover:shadow-[0_0_56px_rgba(0,0,0,0.7)] hover:-translate-y-[1px] hover:border-blue-500/10 hover:bg-background/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
          className
        )}
      >
        {/* Header row: icon + team name */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-card/80 border border-border/50 flex-shrink-0">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-sm font-semibold leading-snug text-foreground whitespace-normal break-normal"
              title={team.name}
            >
              {team.name}
            </div>
          </div>
        </div>

        {/* Meta row: "N people" pill */}
        <div className="mt-3 flex items-center">
          <span className="inline-flex items-center rounded-full bg-card/80 border border-border/50 px-2.5 py-1 text-xs text-muted-foreground/80">
            {team.peopleCount} {team.peopleCount === 1 ? "person" : "people"}
          </span>
        </div>

        {/* Flexible spacer to push CTA to bottom */}
        <div className="flex-1" />

        {/* CTA row at bottom */}
        {team.href && (
          <div className="mt-4 flex items-end">
            <Link
              href={team.href}
              className="inline-flex items-center text-xs font-medium text-blue-400 hover:text-blue-300/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-full px-1"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="mr-1">Open</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    );
  }

  // List view: original layout unchanged
  return (
    <div
      className={cn(
        "group flex flex-col justify-between rounded-2xl border border-border/80 bg-background/60 px-3.5 py-3 transition-all duration-150",
        "hover:scale-[1.01] hover:shadow-[0_4px_16px_rgba(15,23,42,0.3)]",
        "hover:border-blue-500/60 hover:shadow-[0_0_32px_rgba(59,130,246,0.32)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70",
        "min-h-[120px]",
        className
      )}
    >
      {/* Top row: Team name + People pill */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className="text-base font-medium text-foreground truncate flex-1 min-w-0"
          title={team.name}
        >
          {team.name}
        </span>
        <span className="rounded-full bg-card/80 px-2 py-0.5 text-xs text-foreground flex-shrink-0">
          {team.peopleCount}
        </span>
      </div>

      {/* Middle row: Lead */}
      {team.lead && (
        <div className="flex items-center gap-2.5 mb-2.5">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-muted flex items-center justify-center text-xs font-semibold text-foreground">
              {team.lead.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
              Lead
            </span>
            <span
              className="text-sm text-foreground truncate"
              title={team.lead.name}
            >
              {team.lead.name}
            </span>
          </div>
        </div>
      )}

      {/* Bottom row: Open link */}
      {team.href && (
        <div className="mt-auto pt-1.5">
          <Link
            href={team.href}
            className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 rounded"
            onClick={(e) => e.stopPropagation()}
          >
            Open
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      )}
    </div>
  );
}
