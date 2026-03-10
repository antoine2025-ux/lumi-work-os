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
 * Note: Status chips are no longer displayed, but kept for backward compatibility
 */
function deriveStatusChips(
  _person: OrgPerson,
  _directReportsCount?: number
): Array<{ label: string; variant?: "new" | "manager" | "unassigned"; tooltip?: string }> {
  // Return empty array - we no longer show status chips per requirements
  return [];
}

/**
 * Derives manager name and direct reports count from people list
 * TODO [BACKLOG]: Use person.managerId for manager lookup (data now available via OrgPosition.parentId)
 */
function derivePersonMetadata(
  _person: OrgPerson,
  _people: OrgPerson[]
): {
  managerName?: string;
  managerId?: string;
  directReportsCount?: number;
} {
  // TODO [BACKLOG]: Use person.managerId — data is now available
  // const manager = people.find(p => p.userId === person.managerId);
  // const directReports = people.filter(p => p.managerId === person.userId);
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
          <div key={person.id} data-person-id={person.id}>
            <PeopleCard
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
          </div>
        );
      })}
    </div>
  );
});

