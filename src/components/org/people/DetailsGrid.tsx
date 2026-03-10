"use client";

import React from "react";
import { Copy, Mail, MapPin, Calendar, Briefcase, Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { mutedLabelClass } from "./people-styles";
import type { OrgPerson } from "@/types/org";

type DetailsGridProps = {
  person: OrgPerson;
};

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

function calculateTenure(joinedAt?: string | null): string | null {
  if (!joinedAt) return null;
  try {
    const joined = new Date(joinedAt);
    const now = new Date();
    const years = now.getFullYear() - joined.getFullYear();
    const months = now.getMonth() - joined.getMonth();
    const totalMonths = years * 12 + months;
    
    if (totalMonths < 1) return "Less than 1 month";
    if (totalMonths < 12) return `${totalMonths} ${totalMonths === 1 ? "month" : "months"}`;
    if (years === 1 && months === 0) return "1 year";
    return `${years} ${years === 1 ? "year" : "years"}${months > 0 ? `, ${months} ${months === 1 ? "month" : "months"}` : ""}`;
  } catch {
    return null;
  }
}

type DetailItemProps = {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  showCopy?: boolean;
  copyValue?: string;
};

function DetailItem({ icon, label, value, showCopy, copyValue }: DetailItemProps) {
  return (
    <div className="space-y-1.5">
      <div className={cn("flex items-center gap-2", mutedLabelClass)}>
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[13px] text-foreground min-w-0 flex-1">
          {typeof value === "string" ? (
            <span className="truncate block">{value}</span>
          ) : (
            value
          )}
        </div>
        {showCopy && copyValue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(copyValue)}
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 transition-colors duration-150"
          >
            <Copy className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Details grid component showing person facts in 2-column layout
 */
export function DetailsGrid({ person }: DetailsGridProps) {
  const tenure = calculateTenure(person.joinedAt);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Details
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {/* Email */}
        {person.email && (
          <DetailItem
            icon={<Mail className="h-3.5 w-3.5" />}
            label="Email"
            value={person.email}
            showCopy
            copyValue={person.email}
          />
        )}

        {/* Location */}
        {person.location ? (
          <DetailItem
            icon={<MapPin className="h-3.5 w-3.5" />}
            label="Location"
            value={person.location}
          />
        ) : (
          <DetailItem
            icon={<MapPin className="h-3.5 w-3.5" />}
            label="Location"
            value={
              <span className="text-muted-foreground">
                — <span className="text-[10px] text-muted-foreground">Not set</span>
              </span>
            }
          />
        )}

        {/* Tenure */}
        {tenure ? (
          <DetailItem
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="Tenure"
            value={tenure}
          />
        ) : person.joinedAt ? (
          <DetailItem
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="Tenure"
            value={
              <span className="text-muted-foreground">
                — <span className="text-[10px] text-muted-foreground">Unable to calculate</span>
              </span>
            }
          />
        ) : (
          <DetailItem
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="Tenure"
            value={
              <span className="text-muted-foreground">
                — <span className="text-[10px] text-muted-foreground">Start date not set</span>
              </span>
            }
          />
        )}

        {/* Role */}
        {person.role ? (
          <DetailItem
            icon={<Briefcase className="h-3.5 w-3.5" />}
            label="Role"
            value={person.role}
          />
        ) : (
          <DetailItem
            icon={<Briefcase className="h-3.5 w-3.5" />}
            label="Role"
            value={
              <span className="text-muted-foreground">
                — <span className="text-[10px] text-muted-foreground">Not set</span>
              </span>
            }
          />
        )}

        {/* Department */}
        {person.department ? (
          <DetailItem
            icon={<Building2 className="h-3.5 w-3.5" />}
            label="Department"
            value={person.department}
          />
        ) : (
          <DetailItem
            icon={<Building2 className="h-3.5 w-3.5" />}
            label="Department"
            value={
              <span className="text-muted-foreground">
                — <span className="text-[10px] text-muted-foreground">Not assigned</span>
              </span>
            }
          />
        )}

        {/* Team */}
        {person.team ? (
          <DetailItem
            icon={<Users className="h-3.5 w-3.5" />}
            label="Team"
            value={person.team}
          />
        ) : (
          <DetailItem
            icon={<Users className="h-3.5 w-3.5" />}
            label="Team"
            value={
              <span className="text-muted-foreground">
                — <span className="text-[10px] text-muted-foreground">Not assigned</span>
              </span>
            }
          />
        )}

        {/* Manager — TODO [BACKLOG]: Wire using person.managerId (data now available) */}
        {/* {person.managerId && manager ? (
          <DetailItem
            icon={<UserCheck className="h-3.5 w-3.5" />}
            label="Reports to"
            value={manager.name}
          />
        ) : (
          <DetailItem
            icon={<UserCheck className="h-3.5 w-3.5" />}
            label="Reports to"
            value={
              <span className="text-muted-foreground">
                — <span className="text-[10px] text-muted-foreground">Not set</span>
              </span>
            }
          />
        )} */}
      </div>
    </div>
  );
}

