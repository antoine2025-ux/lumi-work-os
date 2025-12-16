"use client";

import { memo, useCallback, useState } from "react";
import { ChevronRight, Users, Check, Plus, UserPlus, Network, AlertTriangle, UserCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { surfaceCardClass, surfaceCardHoverClass, chipBaseClass, chipInactiveClass, focusRingClass } from "./people-styles";
import type { OrgPerson } from "@/types/org";

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
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getChipStyle(variant?: string) {
  switch (variant) {
    case "new":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "manager":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "unassigned":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    default:
      return chipInactiveClass;
  }
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
  directReportsCount,
  statusChips = [],
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

  const handleTeamClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (person.teamId && onTeamClick) {
        onTeamClick(person.teamId);
      }
    },
    [person.teamId, onTeamClick]
  );

  const handleDepartmentClick = useCallback(
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
        "p-4"
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
              handleSelectionClick(e as any);
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
          <Avatar className={cn(
            "h-10 w-10 border shrink-0",
            statusChips.some(c => c.variant === "manager") 
              ? "border-blue-500/40 ring-1 ring-blue-500/20" 
              : "border-white/10"
          )}>
            <AvatarFallback className="bg-slate-800 text-slate-200 text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          {statusChips.some(c => c.variant === "manager") && (
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-blue-500 border-2 border-slate-900 flex items-center justify-center">
              <UserCheck className="h-2 w-2 text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name - strongest contrast */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-[14px] font-semibold text-slate-50 truncate">
              {person.name || "Unknown"}
            </h3>
            {/* Status badges - compact, top-right aligned */}
            {statusChips.length > 0 && (
              <div className="flex items-center gap-0.5 shrink-0">
                {statusChips.slice(0, 2).map((chip, index) => (
                  <span
                    key={index}
                    className={cn(
                      "inline-flex items-center gap-0.5",
                      "rounded-full",
                      "px-1.5 py-0.5",
                      "text-[9px] font-medium",
                      "border",
                      "transition-colors duration-150",
                      getChipStyle(chip.variant)
                    )}
                    title={chip.tooltip}
                  >
                    {chip.variant === "new" && "•"}
                    {chip.variant === "unassigned" && "!"}
                    {chip.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Role - secondary */}
          {person.role ? (
            <p className="text-[12px] font-medium text-slate-400 truncate">{person.role}</p>
          ) : (
            <p className="text-[12px] font-medium text-slate-600 italic truncate" title="Role hasn't been set yet.">
              Not set
            </p>
          )}
        </div>
      </div>

      {/* Zone B: Context - tertiary, max 2 pills */}
      {(person.team || person.department) && (
        <div className="mb-2.5 pt-2 border-t border-white/5">
          <div className="flex flex-wrap items-center gap-1">
            {person.department && (
              <button
                type="button"
                onClick={handleDepartmentClick}
                className={cn(
                  "inline-flex items-center",
                  "rounded-full",
                  "px-1.5 py-0.5",
                  "text-[10px] font-medium",
                  "bg-slate-800/25",
                  "text-slate-600",
                  "border border-slate-700/25",
                  "cursor-pointer",
                  "hover:bg-slate-800/40",
                  "hover:border-slate-600/30",
                  "hover:text-slate-500",
                  "transition-colors duration-150",
                  focusRingClass
                )}
              >
                {person.department}
              </button>
            )}
            {person.team && (
              <button
                type="button"
                onClick={handleTeamClick}
                className={cn(
                  "inline-flex items-center",
                  "rounded-full",
                  "px-1.5 py-0.5",
                  "text-[10px] font-medium",
                  "bg-slate-800/25",
                  "text-slate-600",
                  "border border-slate-700/25",
                  "cursor-pointer",
                  "hover:bg-slate-800/40",
                  "hover:border-slate-600/30",
                  "hover:text-slate-500",
                  "transition-colors duration-150",
                  focusRingClass
                )}
              >
                {person.team}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Zone C: Reporting - only show if manager exists */}
      {managerName && (
        <div className="mb-2.5 pt-2 border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <Network className="h-3 w-3 text-slate-600 shrink-0" />
            <span className="text-[11px] text-slate-600">
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

      {/* Consolidated Status Row - all warnings/issues here */}
      <div className="mt-auto pt-2 border-t border-white/5">
        {!managerName ? (
          <div 
            className="flex items-center gap-1.5 p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 cursor-pointer group/status"
            onClick={(e) => {
              e.stopPropagation();
              // Could trigger assign manager action
            }}
            title="Assign manager"
          >
            <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
            <span className="text-[11px] text-amber-500/90 group-hover/status:text-amber-400 transition-colors">
              Reporting line missing
            </span>
          </div>
        ) : statusChips.some(c => c.variant === "unassigned") ? (
          <div className="flex items-center gap-1.5 p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
            <span className="text-[11px] text-amber-500/90">
              Unassigned
            </span>
          </div>
        ) : directReportsCount !== undefined && directReportsCount > 0 ? (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Users className="h-3 w-3" />
            <span className="tabular-nums">{directReportsCount} {directReportsCount === 1 ? "report" : "reports"}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[11px] text-slate-600 opacity-0 group-hover:opacity-100 group-hover:text-slate-500 transition-all duration-200">
            <span>View</span>
            <ChevronRight className="h-3 w-3 translate-x-0 group-hover:translate-x-0.5 transition-transform" />
          </div>
        )}
      </div>
    </div>
  );
});

