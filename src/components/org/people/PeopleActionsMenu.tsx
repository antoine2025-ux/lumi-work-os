// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
"use client";

import { MoreVertical, UserPlus, Users, UserCheck, Download } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

type PeopleActionsMenuProps = {
  canManagePeople?: boolean;
  onInvite?: () => void;
  onAssignTeam?: () => void;
  onAssignDepartment?: () => void;
  onAssignManager?: () => void;
  onExport?: () => void;
  isExporting?: boolean;
};

/**
 * Actions menu for People page header
 * Contextual actions for managing people
 */
export function PeopleActionsMenu({
  canManagePeople = false,
  onInvite,
  onAssignTeam,
  onAssignManager,
  onExport,
  isExporting = false,
}: PeopleActionsMenuProps) {
  const handleAction = (action: () => void | undefined) => {
    if (action) {
      action();
    } else {
      // Stub action - show toast in real implementation
      console.log("Action not yet implemented");
    }
  };

  const actionButtonClass = cn(
    "w-full flex items-center gap-2",
    "px-3 py-2",
    "text-sm text-foreground",
    "hover:bg-muted",
    "transition-colors duration-150",
    "rounded-lg",
    "text-left"
  );

  const disabledButtonClass = cn(
    actionButtonClass,
    "opacity-50 cursor-not-allowed"
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2",
            "rounded-full border border-border bg-muted/50 px-3 py-1.5",
            "text-[11px] text-muted-foreground",
            "transition-colors hover:bg-slate-700 hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          )}
          aria-label="People actions"
        >
          <MoreVertical className="h-3.5 w-3.5" />
          <span>Actions</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 bg-card border-white/10 p-1"
        align="end"
        side="bottom"
      >
        <div className="space-y-0.5">
          {/* Invite people */}
          {canManagePeople ? (
            <button
              type="button"
              onClick={() => handleAction(onInvite)}
              className={actionButtonClass}
            >
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              <span>Invite people</span>
            </button>
          ) : (
            <Tooltip content="Admins only">
              <button
                type="button"
                disabled
                className={disabledButtonClass}
              >
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <span>Invite people</span>
              </button>
            </Tooltip>
          )}

          {/* Assign team */}
          {canManagePeople ? (
            <button
              type="button"
              onClick={() => handleAction(onAssignTeam)}
              className={actionButtonClass}
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Assign team / department</span>
            </button>
          ) : (
            <Tooltip content="Admins only">
              <button
                type="button"
                disabled
                className={disabledButtonClass}
              >
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Assign team / department</span>
              </button>
            </Tooltip>
          )}

          {/* Assign manager */}
          {canManagePeople ? (
            <button
              type="button"
              onClick={() => handleAction(onAssignManager)}
              className={actionButtonClass}
            >
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <span>Assign manager</span>
            </button>
          ) : (
            <Tooltip content="Admins only">
              <button
                type="button"
                disabled
                className={disabledButtonClass}
              >
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <span>Assign manager</span>
              </button>
            </Tooltip>
          )}

          <div className="h-px bg-white/5 my-1" />

          {/* Export - ADMIN+ only */}
          {canManagePeople ? (
            <button
              type="button"
              onClick={() => handleAction(onExport)}
              disabled={isExporting}
              className={isExporting ? disabledButtonClass : actionButtonClass}
            >
              <Download className="h-4 w-4 text-muted-foreground" />
              <span>{isExporting ? "Exporting…" : "Export people (CSV)"}</span>
            </button>
          ) : (
            <Tooltip content="Admins only">
              <button
                type="button"
                disabled
                className={disabledButtonClass}
              >
                <Download className="h-4 w-4 text-muted-foreground" />
                <span>Export people (CSV)</span>
              </button>
            </Tooltip>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

