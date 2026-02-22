"use client";

import { memo, useCallback, useState } from "react";
import { Check, Plus, Network } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { surfaceCardClass, focusRingClass } from "./people-styles";
import { AvailabilityPill } from "@/components/org/AvailabilityPill";
import type { OrgPerson } from "@/types/org";

type AvailabilityStatus = "UNKNOWN" | "AVAILABLE" | "PARTIALLY_AVAILABLE" | "UNAVAILABLE";

// Extended person type with API fields beyond base OrgPerson
type ExtendedOrgPerson = OrgPerson & {
  availabilityStatus?: AvailabilityStatus | null;
  availabilityStale?: boolean;
};

type PeopleCardProps = {
  person: OrgPerson;
  onOpenPerson: (person: OrgPerson) => void;
  onTeamClick?: (teamId: string) => void;
  onDepartmentClick?: (departmentId: string) => void;
  managerName?: string;
  managerId?: string;
  onManagerClick?: (managerId: string) => void;
  directReportsCount?: number;
  statusChips?: Array<{ label: string; variant?: "new" | "manager" | "unassigned"; tooltip?: string }>;
  isSelected?: boolean;
  onToggleSelection?: (personId: string) => void;
};

function getInitials(name: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) {
    const word = parts[0];
    if (word.length >= 2) return word.substring(0, 2).toUpperCase();
    return word.charAt(0).toUpperCase();
  }
  const first = parts[0]?.[0]?.toUpperCase();
  const last = parts[parts.length - 1]?.[0]?.toUpperCase();
  if (first && last) return `${first}${last}`;
  return "U";
}


/**
 * Premium person card component
 * Clickable card with hover effects and information hierarchy
 */
export const PeopleCard = memo(function PeopleCard({
  person,
  onOpenPerson,
  onTeamClick,
  onDepartmentClick,
  managerName,
  managerId,
  onManagerClick,
  directReportsCount: _directReportsCount,
  statusChips: _statusChips = [], // Not used anymore, but keeping for backward compatibility
  isSelected = false,
  onToggleSelection,
}: PeopleCardProps) {
  const initials = getInitials(person.name);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback(() => {
    onOpenPerson(person);
  }, [person, onOpenPerson]);

  const handleSelectionClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleSelection?.(person.id);
    },
    [person.id, onToggleSelection]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpenPerson(person);
      }
    },
    [person, onOpenPerson]
  );

  const _handleTeamClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (person.teamId && onTeamClick) {
        onTeamClick(person.teamId);
      }
    },
    [person.teamId, onTeamClick]
  );

  const _handleDepartmentClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (person.departmentId && onDepartmentClick) {
        onDepartmentClick(person.departmentId);
      }
    },
    [person.departmentId, onDepartmentClick]
  );

  const handleManagerClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (managerId && onManagerClick) {
        onManagerClick(managerId);
      }
    },
    [managerId, onManagerClick]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative flex flex-col",
        surfaceCardClass,
        "hover:border-white/10",
        "hover:-translate-y-[1px]",
        "hover:shadow-[0_24px_80px_rgba(0,0,0,0.4)]",
        isSelected && "border-primary/50 ring-2 ring-primary/30",
        "cursor-pointer",
        focusRingClass,
        "p-4",
        "transition-all duration-150"
      )}
    >
      {/* Selection checkbox - visible on hover or when selected */}
      {onToggleSelection && (isHovered || isSelected) && (
        <button
          type="button"
          onClick={handleSelectionClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              handleSelectionClick(e as unknown as React.MouseEvent);
            }
          }}
          className={cn(
            "absolute top-2.5 right-2.5 z-10",
            "flex items-center justify-center",
            "h-5 w-5 rounded-full",
            "border-2 transition-colors",
            isSelected
              ? "bg-primary border-primary text-white"
              : "bg-slate-900/80 border-white/20 hover:border-primary/50 text-transparent hover:text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          )}
          aria-label={isSelected ? "Deselect" : "Select"}
        >
          {isSelected ? (
            <Check className="h-3 w-3" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
        </button>
      )}
      {/* Zone A: Identity - Z-shape scan pattern */}
      <div className="flex items-start gap-2.5 mb-3">
        {/* Avatar with manager indicator */}
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10 border border-white/10 shrink-0">
            <AvatarFallback className="bg-slate-800 text-slate-200 text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1 min-w-0">
          {/* Name - primary text, strongest contrast */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-[14px] font-semibold text-slate-50 truncate">
              {person.name || ""}
            </h3>
          </div>

          {/* Role - secondary text */}
          {person.role && (
            <div className="flex items-center gap-2 truncate mb-0.5">
              <p className="text-[12px] font-medium text-slate-400 truncate">{person.role}</p>
            </div>
          )}

          {/* Team/Department - tertiary text, subtle */}
          {(person.team || person.department) && (
            <div className="flex items-center gap-2 truncate">
              {person.team && (
                <p className="text-[11px] text-slate-500 truncate">{person.team}</p>
              )}
              {person.department && person.department !== person.team && (
                <>
                  {person.team && <span className="text-[11px] text-slate-600">•</span>}
                  <p className="text-[11px] text-slate-500 truncate">{person.department}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Zone B: Reporting - only show if manager exists */}
      {managerName && (
        <div className="mb-2.5 pt-2 border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <Network className="h-3 w-3 text-slate-600 shrink-0" />
            <span className="text-[11px] text-slate-500">
              {managerId && onManagerClick ? (
                <button
                  type="button"
                  onClick={handleManagerClick}
                  className="text-slate-400 hover:text-slate-300 hover:underline transition-colors"
                >
                  {managerName}
                </button>
              ) : (
                <span className="text-slate-400">{managerName}</span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Availability - subtle bottom right */}
      {(() => {
        const extended = person as ExtendedOrgPerson;
        if (!extended.availabilityStatus || extended.availabilityStatus === "UNKNOWN") return null;
        return (
          <div className="mt-auto pt-2 border-t border-white/5">
            <div className="flex items-center justify-end">
              <AvailabilityPill
                status={extended.availabilityStatus}
                stale={extended.availabilityStale ?? false}
                subtle={true}
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
});

