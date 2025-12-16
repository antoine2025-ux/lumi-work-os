"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { OrgPerson } from "@/types/org";

type ReportingChainProps = {
  person: OrgPerson;
  people: OrgPerson[];
  onPersonClick: (person: OrgPerson) => void;
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Derives reporting chain from people list
 * Currently infers from role keywords since managerId doesn't exist yet
 */
function deriveReportingChain(
  person: OrgPerson,
  people: OrgPerson[]
): OrgPerson[] {
  // TODO: When managerId is available, build chain using:
  // const peopleMap = new Map(people.map(p => [p.id, p]));
  // let current = person;
  // const chain = [person];
  // while (current.managerId && chain.length < 6) {
  //   const manager = peopleMap.get(current.managerId);
  //   if (!manager || chain.includes(manager)) break; // Prevent cycles
  //   chain.unshift(manager);
  //   current = manager;
  // }
  // return chain;

  // For now, return empty chain since we don't have managerId
  return [];
}

/**
 * Reporting chain component showing manager breadcrumb stack
 */
export function ReportingChain({
  person,
  people,
  onPersonClick,
}: ReportingChainProps) {
  const chain = deriveReportingChain(person, people);

  if (chain.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Reporting Chain
        </h3>
        <p className="text-sm text-slate-400 italic">
          Reporting relationships not set yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Reporting Chain
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {chain.map((manager, index) => (
          <React.Fragment key={manager.id}>
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
            )}
            <button
              type="button"
              onClick={() => onPersonClick(manager)}
              className={cn(
                "flex items-center gap-2",
                "px-2.5 py-1.5",
                "rounded-lg",
                "bg-slate-800/50",
                "hover:bg-slate-800/70",
                "transition-colors",
                "group"
              )}
            >
              <Avatar className="h-6 w-6 border border-white/10">
                <AvatarFallback className="bg-slate-700 text-slate-200 text-xs">
                  {getInitials(manager.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-slate-200 group-hover:text-slate-100">
                {manager.name}
              </span>
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

