"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getDisplayName, getInitials, generateAvatarGradient } from "@/lib/org/personDisplay";
import type { OrgPerson } from "@/types/org";

type PersonIdentityCellProps = {
  person: OrgPerson;
  className?: string;
};

export function PersonIdentityCell({ person, className }: PersonIdentityCellProps) {
  const displayName = getDisplayName({
    fullName: (person as any).fullName || person.name,
    name: person.name,
    email: person.email,
  });
  
  // Use email as fallback if name is missing (never show "Unknown" or "Unnamed")
  // If displayName is empty, try email; if email is also empty, show empty string
  const primaryText = displayName || person.email || "";
  
  const initials = getInitials({
    fullName: (person as any).fullName || person.name,
    name: person.name,
    email: person.email,
  });

  const avatarBgColor = generateAvatarGradient(primaryText);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Avatar with proper initials */}
      <Avatar className="h-10 w-10 shrink-0 border border-white/10">
        <AvatarFallback 
          className="text-slate-100 text-sm font-medium"
          style={{ backgroundColor: avatarBgColor }}
        >
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Name + Title (2 lines max) */}
      <div className="flex min-w-0 flex-col gap-0.5">
        {/* Line 1: Full name (or email fallback) */}
        {primaryText && (
          <div className="truncate text-[13px] font-semibold text-slate-100">
            {primaryText}
          </div>
        )}
        {/* Line 2: Title (only if set) */}
        {person.title && (
          <div className="truncate text-[12px] font-medium text-slate-400">
            {person.title}
          </div>
        )}
      </div>
    </div>
  );
}
