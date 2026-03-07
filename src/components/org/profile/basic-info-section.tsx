import { Mail, MapPin } from "lucide-react";

interface BasicInfoSectionProps {
  displayName: string;
  displayRole: string;
  email?: string | null;
  location?: string | null;
  timezone?: string | null;
}

export function BasicInfoSection({
  displayName,
  displayRole,
  email,
  location,
  timezone,
}: BasicInfoSectionProps) {
  const locationDisplay = location || timezone
    ? `${location || "Remote"}${timezone ? ` (${timezone})` : ""}`
    : null;

  return (
    <div className="space-y-1.5 min-w-0">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Information
      </p>
      <div className="flex items-start gap-2 min-w-0">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#243B7D] text-[10px] font-medium text-foreground">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 overflow-hidden space-y-0.5">
          <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{displayRole}</p>
          {email && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{email}</span>
            </div>
          )}
          {locationDisplay && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{locationDisplay}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
