"use client";

import { memo, useCallback } from "react";
import Link from "next/link";
import { ArrowUp, ArrowDown, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { UnassignedBadge } from "@/components/org/UnassignedBadge";
import { PersonIdentityCell } from "./PersonIdentityCell";
import { tableHeaderClass, focusRingClass } from "./people-styles";
import type { OrgPerson } from "@/types/org";
import type { PeopleFilters } from "./people-filters";

type PeopleTableProps = {
  people: OrgPerson[];
  sort?: PeopleFilters["sort"];
  direction?: PeopleFilters["direction"];
  onRowClick: (person: OrgPerson) => void;
  selectedIds?: string[];
  onToggleSelection?: (personId: string) => void;
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
      <ArrowUp className="h-3 w-3 inline-block ml-1 text-slate-400" />
    ) : (
      <ArrowDown className="h-3 w-3 inline-block ml-1 text-slate-400" />
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-white/5">
            {onToggleSelection && (
              <th className="w-12 px-4 py-4 text-left">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
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
                Department
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {people.map((person, index) => {
            const isSelected = selectedIds.includes(person.id);
            return (
              <tr
                key={person.id}
                role="button"
                tabIndex={0}
                onClick={handleRowClick(person)}
                onKeyDown={handleRowKeyDown(person)}
                className={cn(
                  "border-b border-white/5",
                  "text-[13px] text-slate-200",
                  "transition-colors duration-150",
                  isSelected ? "bg-primary/5" : "hover:bg-slate-800/50",
                  focusRingClass,
                  "cursor-pointer"
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
                          handleSelectionClick(person.id)(e as any);
                        }
                      }}
                      className={cn(
                        "flex items-center justify-center",
                        "h-5 w-5 rounded border-2 transition-colors",
                        isSelected
                          ? "bg-primary border-primary text-white"
                          : "border-white/20 hover:border-primary/50 text-transparent",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                      )}
                      aria-label={isSelected ? "Deselect" : "Select"}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </button>
                  </td>
                )}

                {/* Name column - Rich identity cell */}
                <td className="px-6 py-3">
                  <PersonIdentityCell person={person} />
                </td>

              {/* Email column */}
              <td className="px-6 py-3">
                {person.email ? (
                  <div
                    className="truncate text-[13px] text-slate-400 max-w-[200px]"
                    title={person.email}
                  >
                    {person.email}
                  </div>
                ) : (
                  <div
                    className="truncate text-[13px] text-slate-500 italic max-w-[200px]"
                    title="Email hasn't been set yet."
                  >
                    Not set
                  </div>
                )}
              </td>

              {/* Role column */}
              <td className="px-6 py-3">
                {person.role ? (
                  <span className="text-[13px] text-slate-300">{person.role}</span>
                ) : (
                  <UnassignedBadge field="role" />
                )}
              </td>

              {/* Team column */}
              <td className="px-6 py-3">
                {person.team ? (
                  <Link
                    href={`/org/people?teamId=${person.teamId}`}
                    className="text-[13px] text-blue-400 hover:text-blue-300 hover:underline transition-colors duration-150 truncate block max-w-[150px]"
                    onClick={(e) => e.stopPropagation()}
                    title={person.team}
                  >
                    {person.team}
                  </Link>
                ) : (
                  <UnassignedBadge field="team" />
                )}
              </td>

              {/* Department column */}
              <td className="px-6 py-3">
                {person.department ? (
                  <Link
                    href={`/org/people?departmentId=${person.departmentId}`}
                    className="text-[13px] text-blue-400 hover:text-blue-300 hover:underline transition-colors duration-150 truncate block max-w-[150px]"
                    onClick={(e) => e.stopPropagation()}
                    title={person.department}
                  >
                    {person.department}
                  </Link>
                ) : (
                  <UnassignedBadge field="department" />
                )}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
