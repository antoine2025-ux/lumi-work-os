"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { PeopleCard } from "./PeopleCard";
import { PeopleCardSkeleton } from "./PeopleCardSkeleton";
import type { OrgPerson } from "@/types/org";

type PeopleCardsGridProps = {
  people: OrgPerson[];
  isLoading?: boolean;
  onOpenPerson: (person: OrgPerson) => void;
  onTeamClick?: (teamId: string) => void;
  onDepartmentClick?: (departmentId: string) => void;
  onManagerClick?: (managerId: string) => void;
  selectedIds?: string[];
  onToggleSelection?: (personId: string) => void;
  className?: string;
};

/**
 * Derives status chips for a person
 */
function deriveStatusChips(
  person: OrgPerson,
  directReportsCount?: number
): Array<{ label: string; variant?: "new" | "manager" | "unassigned"; tooltip?: string }> {
  const chips: Array<{ label: string; variant?: "new" | "manager" | "unassigned"; tooltip?: string }> = [];

  // New joiner (last 30 days)
  if (person.joinedAt) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const joinedDate = new Date(person.joinedAt);
    if (joinedDate >= thirtyDaysAgo) {
      chips.push({ label: "New", variant: "new" });
    }
  }

  // Manager (inferred from role)
  const role = person.role?.toLowerCase() || "";
  if (
    role.includes("lead") ||
    role.includes("manager") ||
    role.includes("director") ||
    role.includes("head") ||
    role.includes("chief")
  ) {
    const tooltip = directReportsCount !== undefined && directReportsCount > 0
      ? `Manages ${directReportsCount} ${directReportsCount === 1 ? "person" : "people"}`
      : "People manager";
    chips.push({ label: "Manager", variant: "manager", tooltip });
  }

  // Unassigned
  if (!person.teamId && !person.departmentId) {
    chips.push({ label: "Unassigned", variant: "unassigned" });
  }

  return chips;
}

/**
 * Derives manager name and direct reports count from people list
 * TODO: When managerId is available, use that instead
 */
function derivePersonMetadata(
  person: OrgPerson,
  people: OrgPerson[]
): {
  managerName?: string;
  managerId?: string;
  directReportsCount?: number;
} {
  // TODO: When managerId is available:
  // const manager = people.find(p => p.id === person.managerId);
  // const directReports = people.filter(p => p.managerId === person.id);
  // return {
  //   managerName: manager?.name,
  //   managerId: manager?.id,
  //   directReportsCount: directReports.length,
  // };

  return {
    managerName: undefined,
    managerId: undefined,
    directReportsCount: undefined,
  };
}

/**
 * Premium cards grid for People view
 * Responsive grid layout with premium card styling
 */
export const PeopleCardsGrid = memo(function PeopleCardsGrid({
  people,
  isLoading = false,
  onOpenPerson,
  onTeamClick,
  onDepartmentClick,
  onManagerClick,
  selectedIds = [],
  onToggleSelection,
  className,
}: PeopleCardsGridProps) {
  // Memoize person metadata to avoid recalculating on every render
  const personMetadata = useMemo(() => {
    const metadata = new Map<string, { managerName?: string; managerId?: string; directReportsCount?: number }>();
    people.forEach((person) => {
      metadata.set(person.id, derivePersonMetadata(person, people));
    });
    return metadata;
  }, [people]);

  // Memoize status chips (with tooltips)
  const personStatusChips = useMemo(() => {
    const chips = new Map<string, Array<{ label: string; variant?: "new" | "manager" | "unassigned"; tooltip?: string }>>();
    people.forEach((person) => {
      const metadata = personMetadata.get(person.id);
      chips.set(person.id, deriveStatusChips(person, metadata?.directReportsCount));
    });
    return chips;
  }, [people, personMetadata]);

  if (isLoading) {
    return (
      <div
        className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
          className
        )}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <PeopleCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (people.length === 0) {
    return null; // Empty state handled by parent
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
        className
      )}
    >
      {people.map((person) => {
        const metadata = personMetadata.get(person.id);
        const statusChips = personStatusChips.get(person.id) || [];

        return (
          <PeopleCard
            key={person.id}
            person={person}
            onOpenPerson={onOpenPerson}
            onTeamClick={onTeamClick}
            onDepartmentClick={onDepartmentClick}
            managerName={metadata?.managerName}
            managerId={metadata?.managerId}
            onManagerClick={onManagerClick}
            directReportsCount={metadata?.directReportsCount}
            statusChips={statusChips}
            isSelected={selectedIds.includes(person.id)}
            onToggleSelection={onToggleSelection}
          />
        );
      })}
    </div>
  );
});

