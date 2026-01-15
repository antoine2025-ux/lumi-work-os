"use client";

import { Users, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { mutedLabelClass, focusRingClass } from "./people-styles";
import type { OrgPerson } from "@/types/org";

type ConnectionsProps = {
  person: OrgPerson;
  people: OrgPerson[];
  onPersonClick: (person: OrgPerson) => void;
  onViewAll?: (type: "reports" | "peers" | "teammates") => void;
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Derives connections from people list
 */
function deriveConnections(
  person: OrgPerson,
  people: OrgPerson[]
): {
  directReports: OrgPerson[];
  peers: OrgPerson[];
  teammates: OrgPerson[];
} {
  // Direct reports - TODO: When managerId is available
  // const directReports = people.filter(p => p.managerId === person.id);
  const directReports: OrgPerson[] = [];

  // Peers - people with same managerId (excluding person)
  // TODO: When managerId is available
  // const peers = people.filter(
  //   p => p.managerId === person.managerId && p.id !== person.id
  // );
  const peers: OrgPerson[] = [];

  // Teammates - people from same team (excluding person)
  const teammates = person.teamId
    ? people
        .filter((p) => p.teamId === person.teamId && p.id !== person.id)
        .slice(0, 6)
    : [];

  return { directReports, peers, teammates };
}

type PersonChipProps = {
  person: OrgPerson;
  onClick: () => void;
};

function PersonChip({ person, onClick }: PersonChipProps) {
  const initials = getInitials(person.name);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2",
        "px-2.5 py-1.5",
        "rounded-lg",
        "bg-slate-800/50",
        "hover:bg-slate-800/70",
        "transition-colors",
        "group",
        "w-full text-left"
      )}
    >
      <Avatar className="h-8 w-8 border border-white/10 shrink-0">
        <AvatarFallback className="bg-slate-700 text-slate-200 text-xs">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 group-hover:text-slate-100 truncate">
          {person.name}
        </p>
        {person.role && (
          <p className="text-xs text-slate-400 truncate">{person.role}</p>
        )}
      </div>
    </button>
  );
}

/**
 * Connections component showing direct reports, peers, and teammates
 */
export function Connections({
  person,
  people,
  onPersonClick,
  onViewAll,
}: ConnectionsProps) {
  const { directReports, peers, teammates } = deriveConnections(person, people);

  return (
    <div className="space-y-4">
      <h3 className={mutedLabelClass}>
        Connections
      </h3>

      {/* Direct Reports */}
      {directReports.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-300">
                Direct Reports ({directReports.length})
              </span>
            </div>
            {directReports.length > 6 && onViewAll && (
              <button
                type="button"
                onClick={() => onViewAll("reports")}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                View all
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {directReports.slice(0, 6).map((report) => (
              <PersonChip
                key={report.id}
                person={report}
                onClick={() => onPersonClick(report)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Peers */}
      {peers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-300">
                Peers ({peers.length})
              </span>
            </div>
            {peers.length > 6 && onViewAll && (
              <button
                type="button"
                onClick={() => onViewAll("peers")}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                View all
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {peers.slice(0, 6).map((peer) => (
              <PersonChip
                key={peer.id}
                person={peer}
                onClick={() => onPersonClick(peer)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Teammates */}
      {teammates.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-300">
                Team Members ({teammates.length})
              </span>
            </div>
            {teammates.length > 6 && onViewAll && (
              <button
                type="button"
                onClick={() => onViewAll("teammates")}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                View all
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {teammates.slice(0, 6).map((teammate) => (
              <PersonChip
                key={teammate.id}
                person={teammate}
                onClick={() => onPersonClick(teammate)}
              />
            ))}
          </div>
        </div>
      )}

      {directReports.length === 0 && peers.length === 0 && teammates.length === 0 && (
        <p className="text-sm text-slate-400 italic">
          Reporting relationships not set yet.
        </p>
      )}
    </div>
  );
}

