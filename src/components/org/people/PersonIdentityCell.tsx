"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { OrgPerson } from "@/types/org";

type PersonIdentityCellProps = {
  person: OrgPerson;
  className?: string;
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PersonIdentityCell({ person, className }: PersonIdentityCellProps) {
  const initials = getInitials(person.name);
  const secondaryText = person.role || person.email;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Avatar */}
      <Avatar className="h-10 w-10 shrink-0 border border-white/10">
        <AvatarFallback className="bg-slate-800 text-slate-200 text-sm font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Name + Secondary */}
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="truncate text-[13px] font-semibold text-slate-100">
          {person.name || <span className="text-slate-500 italic" title="Name hasn't been set yet.">Unknown</span>}
        </div>
        {person.role ? (
          <div className="truncate text-[12px] font-medium text-slate-300">
            {person.role}
          </div>
        ) : person.email ? (
          <div className="truncate text-[12px] text-slate-400">
            {person.email}
          </div>
        ) : (
          <div className="truncate text-[12px] text-slate-500 italic" title="Role and email haven't been set yet.">
            Not set
          </div>
        )}
      </div>
    </div>
  );
}

