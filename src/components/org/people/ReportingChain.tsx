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
 * Derives reporting chain by walking up managerId links.
 * Returns the chain from top-most ancestor down to (but not including) the person.
 * Returns empty array if the person has no manager — the component shows an empty state.
 */
function deriveReportingChain(
  person: OrgPerson,
  people: OrgPerson[]
): OrgPerson[] {
  const peopleMap = new Map(people.map((p) => [p.id, p]));
  const chain: OrgPerson[] = [];
  const visited = new Set<string>([person.id]);
  let current = person;

  while (current.managerId && chain.length < 6) {
    const manager = peopleMap.get(current.managerId);
    if (!manager || visited.has(manager.id)) break; // missing or cycle — stop
    visited.add(manager.id);
    chain.unshift(manager); // prepend so chain reads top → bottom
    current = manager;
  }

  return chain;
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
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Reporting Chain
        </h3>
        <p className="text-sm text-muted-foreground italic">
          Reporting relationships not set yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Reporting Chain
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {chain.map((manager, index) => (
          <React.Fragment key={manager.id}>
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <button
              type="button"
              onClick={() => onPersonClick(manager)}
              className={cn(
                "flex items-center gap-2",
                "px-2.5 py-1.5",
                "rounded-lg",
                "bg-muted/50",
                "hover:bg-muted/70",
                "transition-colors",
                "group"
              )}
            >
              <Avatar className="h-6 w-6 border border-white/10">
                <AvatarFallback className="bg-slate-700 text-foreground text-xs">
                  {getInitials(manager.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground group-hover:text-foreground">
                {manager.name}
              </span>
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

