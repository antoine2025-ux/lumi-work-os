"use client";

import { GitCompare, Bookmark, X, Users, Building2, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type PeopleSelectionBarProps = {
  selectedCount: number;
  canCompare: boolean;
  onCompare: () => void;
  onSaveShortlist: () => void;
  onClear: () => void;
  onAssignTeam?: () => void;
  onAssignDepartment?: () => void;
  onAssignManager?: () => void;
  canManagePeople?: boolean;
};

/**
 * Sticky selection bar at bottom of People page
 * Shows when 1+ people are selected
 */
export function PeopleSelectionBar({
  selectedCount,
  canCompare,
  onCompare,
  onSaveShortlist,
  onClear,
  onAssignTeam,
  onAssignDepartment,
  onAssignManager,
  canManagePeople = false,
}: PeopleSelectionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-3",
        "rounded-3xl",
        "bg-slate-900/95 backdrop-blur-sm",
        "border border-white/10",
        "shadow-[0_24px_80px_rgba(0,0,0,0.35)]",
        "px-5 py-3.5",
        "animate-in slide-in-from-bottom-4 duration-200"
      )}
    >
      <span className="text-sm font-medium text-slate-200">
        {selectedCount} {selectedCount === 1 ? "selected" : "selected"}
      </span>

      <div className="h-4 w-px bg-white/10" />

      <button
        type="button"
        onClick={onCompare}
        disabled={!canCompare}
        className={cn(
          "inline-flex items-center gap-2",
          "px-3 py-1.5",
          "rounded-lg",
          "text-sm font-medium",
          "transition-colors",
          canCompare
            ? "bg-primary/20 text-primary hover:bg-primary/30"
            : "bg-slate-800/50 text-slate-500 cursor-not-allowed"
        )}
      >
        <GitCompare className="h-4 w-4" />
        <span>Compare</span>
      </button>

      <button
        type="button"
        onClick={onSaveShortlist}
        className={cn(
          "inline-flex items-center gap-2",
          "px-3 py-1.5",
          "rounded-lg",
          "text-sm font-medium",
          "bg-slate-800/50 text-slate-200",
          "hover:bg-slate-800/70",
          "transition-colors"
        )}
      >
        <Bookmark className="h-4 w-4" />
        <span>Save shortlist</span>
      </button>

      {/* Bulk actions */}
      {canManagePeople && (
        <>
          <div className="h-4 w-px bg-white/10" />
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-2",
                  "px-3 py-1.5",
                  "rounded-lg",
                  "text-sm font-medium",
                  "bg-slate-800/50 text-slate-200",
                  "hover:bg-slate-800/70",
                  "transition-colors"
                )}
              >
                <Users className="h-4 w-4" />
                <span>Assign</span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-48 bg-slate-900 border-white/10 p-1"
              align="end"
              side="top"
            >
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={onAssignTeam}
                  className={cn(
                    "w-full flex items-center gap-2",
                    "px-3 py-2",
                    "text-sm text-slate-200",
                    "hover:bg-slate-800",
                    "transition-colors duration-150",
                    "rounded-lg",
                    "text-left"
                  )}
                >
                  <Users className="h-4 w-4 text-slate-400" />
                  <span>Assign team</span>
                </button>
                <button
                  type="button"
                  onClick={onAssignDepartment}
                  className={cn(
                    "w-full flex items-center gap-2",
                    "px-3 py-2",
                    "text-sm text-slate-200",
                    "hover:bg-slate-800",
                    "transition-colors duration-150",
                    "rounded-lg",
                    "text-left"
                  )}
                >
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span>Assign department</span>
                </button>
                <button
                  type="button"
                  onClick={onAssignManager}
                  className={cn(
                    "w-full flex items-center gap-2",
                    "px-3 py-2",
                    "text-sm text-slate-200",
                    "hover:bg-slate-800",
                    "transition-colors duration-150",
                    "rounded-lg",
                    "text-left"
                  )}
                >
                  <UserCheck className="h-4 w-4 text-slate-400" />
                  <span>Assign manager</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}

      <button
        type="button"
        onClick={onClear}
        className={cn(
          "inline-flex items-center justify-center",
          "h-8 w-8 rounded-lg",
          "text-slate-400",
          "hover:bg-slate-800/70 hover:text-slate-200",
          "transition-colors"
        )}
        aria-label="Clear selection"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

