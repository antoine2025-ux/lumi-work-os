"use client";

import { memo, useCallback } from "react";
import Link from "next/link";
import { ArrowUp, ArrowDown, Check, ChevronRight, MoreVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonIdentityCell } from "./PersonIdentityCell";
import { tableHeaderClass, focusRingClass } from "./people-styles";
import { AvailabilityPill } from "@/components/org/AvailabilityPill";
import { CapacityStatusBadge, type CapacityStatus } from "@/components/org/capacity/CapacityStatusBadge";
import { CapacityQuickEntryPopover } from "@/components/org/capacity/CapacityQuickEntryPopover";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OrgPerson } from "@/types/org";
import type { PeopleFilters } from "./people-filters";

type AvailabilityStatus = "UNKNOWN" | "AVAILABLE" | "PARTIALLY_AVAILABLE" | "UNAVAILABLE";

// Extended person type with API fields beyond base OrgPerson
type ExtendedTablePerson = OrgPerson & {
  availabilityStatus?: AvailabilityStatus | null;
  availabilityStale?: boolean;
};

export type PersonCapacityRow = {
  personId: string;
  status: CapacityStatus;
  utilizationPct: number;
  hasContract: boolean;
  hasAvailability: boolean;
};

type PeopleTableProps = {
  people: OrgPerson[];
  sort?: PeopleFilters["sort"];
  direction?: PeopleFilters["direction"];
  onRowClick: (person: OrgPerson) => void;
  selectedIds?: string[];
  onToggleSelection?: (personId: string) => void;
  isOwner?: boolean;
  onDeletePerson?: (person: OrgPerson) => void;
  /** Capacity data keyed by personId */
  capacityData?: Map<string, PersonCapacityRow>;
  /** Person ID to highlight (deep-link) */
  highlightedPersonId?: string | null;
  /** Called when capacity data should be refreshed */
  onCapacityRefresh?: () => void;
};

/**
 * Premium People table component with clickable rows and rich identity cells
 * Memoized for performance
 */
export const PeopleTable = memo(function PeopleTable({
  people,
  sort = "name",
  direction = "asc",
  onRowClick,
  selectedIds = [],
  onToggleSelection,
  isOwner = false,
  onDeletePerson,
  capacityData,
  onCapacityRefresh,
  highlightedPersonId,
}: PeopleTableProps) {
  const handleRowClick = useCallback(
    (person: OrgPerson) => (e: React.MouseEvent) => {
      // Don't trigger if clicking on a link or checkbox
      if (
        (e.target as HTMLElement).closest("a") ||
        (e.target as HTMLElement).closest("button")
      ) {
        return;
      }
      onRowClick(person);
    },
    [onRowClick]
  );

  const handleSelectionClick = useCallback(
    (personId: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleSelection?.(personId);
    },
    [onToggleSelection]
  );

  const handleRowKeyDown = useCallback(
    (person: OrgPerson) => (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onRowClick(person);
      }
    },
    [onRowClick]
  );

  const getSortIcon = (column: PeopleFilters["sort"]) => {
    if (sort !== column) return null;
    return direction === "asc" ? (
      <ArrowUp className="h-3 w-3 inline-block ml-1 text-muted-foreground" />
    ) : (
      <ArrowDown className="h-3 w-3 inline-block ml-1 text-muted-foreground" />
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-white/5">
            {onToggleSelection && (
              <th className="w-12 px-4 py-4 text-left">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {/* Selection column header */}
                </div>
              </th>
            )}
            <th className="px-6 py-4 text-left">
              <div className={cn(tableHeaderClass, "flex items-center gap-1")}>
                Name
                {getSortIcon("name")}
              </div>
            </th>
            <th className="px-6 py-4 text-left">
              <div className={tableHeaderClass}>
                Email
              </div>
            </th>
            <th className="px-6 py-4 text-left">
              <div className={cn(tableHeaderClass, "flex items-center gap-1")}>
                Role
                {getSortIcon("role")}
              </div>
            </th>
            <th className="px-6 py-4 text-left">
              <div className={tableHeaderClass}>
                Team
              </div>
            </th>
            <th className="px-6 py-4 text-left">
              <div className={tableHeaderClass}>
                Capacity
              </div>
            </th>
            <th className="w-24 px-6 py-4 text-right">
              <div className={cn(tableHeaderClass, "text-right")}>
                {/* Availability column - right aligned */}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {people.map((person, _index) => {
            const isSelected = selectedIds.includes(person.id);
            const extended = person as ExtendedTablePerson;
            const availabilityStatus = extended.availabilityStatus;
            
            return (
              <tr
                key={person.id}
                data-person-id={person.id}
                role="button"
                tabIndex={0}
                onClick={handleRowClick(person)}
                onKeyDown={handleRowKeyDown(person)}
                className={cn(
                  "border-b border-white/5",
                  "text-[13px] text-foreground",
                  "transition-all duration-150",
                  isSelected ? "bg-primary/5" : "hover:bg-muted/50 group",
                  focusRingClass,
                  "cursor-pointer relative",
                  highlightedPersonId === person.id && "ring-2 ring-primary/60 bg-primary/5"
                )}
                style={{ height: "64px" }}
              >
                {/* Selection checkbox */}
                {onToggleSelection && (
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={handleSelectionClick(person.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          handleSelectionClick(person.id)(e as unknown as React.MouseEvent);
                        }
                      }}
                      className={cn(
                        "flex items-center justify-center",
                        "h-5 w-5 rounded border-2 transition-colors",
                        isSelected
                          ? "bg-primary border-primary text-foreground"
                          : "border-white/20 hover:border-primary/50 text-transparent",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                      )}
                      aria-label={isSelected ? "Deselect" : "Select"}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </button>
                  </td>
                )}

              {/* Name column - Rich identity cell (fully clickable) */}
              <td className="px-6 py-3">
                <PersonIdentityCell person={person} />
              </td>

              {/* Email column */}
              <td className="px-6 py-3">
                {person.email && (
                  <div
                    className="truncate text-[13px] text-muted-foreground max-w-[200px]"
                    title={person.email}
                  >
                    {person.email}
                  </div>
                )}
              </td>

              {/* Role column - secondary text */}
              <td className="px-6 py-3">
                {person.role && (
                  <span className="text-[13px] text-muted-foreground">{person.role}</span>
                )}
              </td>

              {/* Team column - tertiary text */}
              <td className="px-6 py-3">
                {person.team && (
                  <Link
                    href={`/org/directory?teamId=${person.teamId}`}
                    className="text-[12px] text-muted-foreground hover:text-muted-foreground hover:underline transition-colors duration-150 truncate block max-w-[150px]"
                    onClick={(e) => e.stopPropagation()}
                    title={person.team}
                  >
                    {person.team}
                  </Link>
                )}
              </td>

              {/* Capacity column */}
              <td className="px-6 py-3">
                {capacityData ? (() => {
                  const cap = capacityData.get(person.id);
                  if (!cap || cap.status === "MISSING") {
                    return (
                      <CapacityQuickEntryPopover
                        personId={person.id}
                        personName={person.name ?? "Unknown"}
                        onSaved={onCapacityRefresh}
                        trigger={
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground">
                            Set capacity
                          </Button>
                        }
                      />
                    );
                  }
                  return (
                    <div className="flex items-center gap-1.5">
                      <CapacityStatusBadge
                        status={cap.status}
                        utilizationPct={cap.utilizationPct * 100}
                      />
                      <CapacityQuickEntryPopover
                        personId={person.id}
                        personName={person.name ?? "Unknown"}
                        onSaved={onCapacityRefresh}
                      />
                    </div>
                  );
                })() : null}
              </td>

              {/* Actions column - menu and availability */}
              <td className="px-6 py-3">
                <div className="flex items-center justify-end gap-2">
                  {availabilityStatus && availabilityStatus !== "UNKNOWN" ? (
                    <AvailabilityPill
                      status={availabilityStatus}
                      stale={extended.availabilityStale ?? false}
                      subtle={true}
                    />
                  ) : null}
                  {isOwner && onDeletePerson && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "flex items-center justify-center",
                            "h-7 w-7 rounded",
                            "text-muted-foreground hover:text-muted-foreground",
                            "hover:bg-muted/50",
                            "transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                          )}
                          aria-label="More options"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-48 bg-card border-border"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePerson(person);
                          }}
                          className="text-red-400 focus:text-red-300 focus:bg-red-950/20 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete person
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
