"use client";

import { X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { chipInactiveClass, chipActiveClass, focusRingClass } from "./people-styles";
import type { OrgPerson } from "@/types/org";

type ProfileHeaderProps = {
  person: OrgPerson;
  statusChips?: Array<{ label: string; variant?: "default" | "new" | "manager" | "unassigned" }>;
  onClose: () => void;
  onTeamClick?: () => void;
  onDepartmentClick?: () => void;
  orgId?: string;
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ProfileHeader({
  person,
  statusChips = [],
  onClose,
  onTeamClick,
  onDepartmentClick,
  orgId: _orgId,
}: ProfileHeaderProps) {
  const initials = getInitials(person.name);

  const getChipStyle = (variant?: string) => {
    switch (variant) {
      case "new":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "manager":
        return chipActiveClass;
      case "unassigned":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return chipInactiveClass;
    }
  };

  return (
    <div className="space-y-4 pb-4 border-b border-white/10">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Avatar className="h-20 w-20 border border-white/10 shrink-0">
          <AvatarFallback className="bg-slate-800 text-slate-200 text-xl font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Name + Role */}
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-semibold text-slate-100 mb-1">
            {person.name || <span className="text-slate-500 italic" title="Name hasn't been set yet.">Unknown</span>}
          </h2>
          {person.role ? (
            <p className="text-sm text-slate-400 mb-3">{person.role}</p>
          ) : (
            <p className="text-sm text-slate-500 italic mb-3" title="Role hasn't been set yet.">Not set</p>
          )}

          {/* Team + Department Pills */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {person.team ? (
              <button
                type="button"
                onClick={onTeamClick}
                className={cn(
                  chipInactiveClass,
                  "cursor-pointer",
                  focusRingClass
                )}
              >
                {person.team}
              </button>
            ) : (
              <span
                className={cn(
                  chipInactiveClass,
                  "text-slate-500 italic cursor-default"
                )}
                title="Team hasn't been set yet."
              >
                Not set
              </span>
            )}
            {person.department ? (
              <button
                type="button"
                onClick={onDepartmentClick}
                className={cn(
                  chipInactiveClass,
                  "cursor-pointer",
                  focusRingClass
                )}
              >
                {person.department}
              </button>
            ) : (
              <span
                className={cn(
                  chipInactiveClass,
                  "text-slate-500 italic cursor-default"
                )}
                title="Department hasn't been set yet."
              >
                Not set
              </span>
            )}
          </div>

          {/* Status Chips */}
          {statusChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {statusChips.map((chip, index) => (
                <span
                  key={index}
                  className={cn(
                    "inline-flex items-center",
                    "rounded-full",
                    "px-2.5 py-0.5",
                    "text-[10px] font-medium uppercase tracking-wide",
                    "border",
                    getChipStyle(chip.variant)
                  )}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Close button + Open full profile */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {/* Optional: Open full profile link - disabled for now */}
        </div>
      </div>
    </div>
  );
}

