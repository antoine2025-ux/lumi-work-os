"use client";

import { Users, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import type { OrgTreeNode } from "./types";

type TeamNodeProps = {
  node: OrgTreeNode;
  index: number;
};

/**
 * Presentational component for a team node in Tree View
 */
export function TeamNode({ node, index: _index }: TeamNodeProps) {
  const router = useRouter();

  const handleOpenTeam = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/org/structure?tab=teams&teamId=${node.id}`);
  };

  return (
    <div
      className="group flex flex-col rounded-2xl border border-border/60 bg-card/40 px-4 py-4 transition-all duration-150 hover:-translate-y-[1px] hover:border-border/70 hover:bg-card/60 hover:shadow-lg hover:shadow-[0_0_0_2px_rgba(90,145,255,0.35)] hover:ring-1 hover:ring-blue-400/40"
      style={{
        transition: "box-shadow 120ms ease-in-out, ring 120ms ease-in-out",
      }}
    >
      {/* Top row: Team name + headcount pill */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Team icon */}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 flex-shrink-0">
            <Users className="h-4 w-4 text-blue-400" />
          </div>
          <h4 className="text-base font-medium text-foreground flex-1 min-w-0">
            {node.name}
          </h4>
        </div>
        <span className="inline-flex items-center rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-300 flex-shrink-0">
          {node.peopleCount} {node.peopleCount === 1 ? "person" : "people"}
        </span>
      </div>

      {/* Second row: Lead info (only if lead exists) */}
      {node.lead ? (
        <div className="flex items-center gap-2.5 mb-3">
          <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarFallback className="bg-slate-700/50 border border-slate-600/50 text-xs text-muted-foreground">
              {node.lead.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col leading-tight min-w-0 flex-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Lead</span>
            <span className="text-sm font-medium text-muted-foreground truncate">
              {node.lead.name}
            </span>
          </div>
        </div>
      ) : null}

      {/* Bottom: Open button (primary affordance) */}
      <div className="mt-auto pt-2">
        <button
          type="button"
          onClick={handleOpenTeam}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded px-2 py-1 hover:bg-blue-500/10 whitespace-nowrap group-hover:gap-2"
        >
          Open
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

