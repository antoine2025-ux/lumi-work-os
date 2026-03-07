"use client";

import { useState, useEffect, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ProfileHeader } from "./ProfileHeader";
import { ReportingChain } from "./ReportingChain";
import { Connections } from "./Connections";
import { DetailsGrid } from "./DetailsGrid";
import { ActivityMiniTimeline } from "./ActivityMiniTimeline";
import { PersonResponsibilities } from "./PersonResponsibilities";
import type { OrgPerson } from "@/types/org";
import type { PeopleFilters } from "./people-filters";

type PersonProfileDrawerProps = {
  person: OrgPerson | null;
  people: OrgPerson[];
  isOpen: boolean;
  onClose: () => void;
  onPersonClick: (person: OrgPerson) => void;
  onFiltersChange?: (filters: Partial<PeopleFilters>) => void;
  orgId?: string;
};

/**
 * Derives status chips for a person
 */
function deriveStatusChips(person: OrgPerson): Array<{ label: string; variant?: "default" | "new" | "manager" | "unassigned" }> {
  const chips: Array<{ label: string; variant?: "default" | "new" | "manager" | "unassigned" }> = [];

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
    chips.push({ label: "Manager", variant: "manager" });
  }

  // Unassigned
  if (!person.teamId && !person.departmentId) {
    chips.push({ label: "Unassigned", variant: "unassigned" });
  }

  return chips;
}

/**
 * Premium Person Profile Drawer
 * Right-side sheet with comprehensive person information
 */
export function PersonProfileDrawer({
  person,
  people,
  isOpen,
  onClose,
  onPersonClick,
  onFiltersChange,
  orgId,
}: PersonProfileDrawerProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Show skeleton for 150ms for perceived performance
  useEffect(() => {
    if (isOpen && person) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, person]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const statusChips = useMemo(() => {
    if (!person) return [];
    return deriveStatusChips(person);
  }, [person]);

  const handleTeamClick = () => {
    if (person?.teamId && onFiltersChange) {
      onFiltersChange({ teamId: person.teamId });
      onClose();
    }
  };

  const handleDepartmentClick = () => {
    if (person?.departmentId && onFiltersChange) {
      onFiltersChange({ departmentId: person.departmentId });
      onClose();
    }
  };

  const handleViewAll = (type: "reports" | "peers" | "teammates") => {
    if (!person || !onFiltersChange) return;

    switch (type) {
      case "reports":
        // TODO [BACKLOG]: Filter direct reports using person.managerId (data now available)
        break;
      case "peers":
        // TODO [BACKLOG]: Filter peers sharing the same managerId (data now available)
        break;
      case "teammates":
        if (person.teamId) {
          onFiltersChange({ teamId: person.teamId });
          onClose();
        }
        break;
    }
  };

  // Handle missing person gracefully
  if (!person) {
    if (isOpen) {
      // Close drawer if person is missing
      setTimeout(() => onClose(), 0);
    }
    return null;
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Right-side Sheet */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-full max-w-[560px] z-50",
          "bg-card border-l border-white/10 text-foreground",
          "overflow-hidden flex flex-col",
          "shadow-[0_24px_80px_rgba(0,0,0,0.35)]",
          "animate-in slide-in-from-right-full duration-250"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="person-profile-title"
      >
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            // Skeleton state
            <div className="space-y-6 animate-pulse">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="h-20 w-20 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-6 w-48 bg-muted rounded" />
                    <div className="h-4 w-32 bg-muted rounded" />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-16 bg-muted rounded" />
              </div>
              <div className="space-y-3">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-16 bg-muted rounded" />
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <ProfileHeader
                person={person}
                statusChips={statusChips}
                onClose={onClose}
                onTeamClick={handleTeamClick}
                onDepartmentClick={handleDepartmentClick}
                orgId={orgId}
              />

              <div className="space-y-6 pt-4">
                {/* Reporting Chain */}
                <ReportingChain
                  person={person}
                  people={people}
                  onPersonClick={onPersonClick}
                />

                {/* Connections */}
                <Connections
                  person={person}
                  people={people}
                  onPersonClick={onPersonClick}
                  onViewAll={handleViewAll}
                />

                {/* Responsibilities */}
                <PersonResponsibilities personId={person.id} />

                {/* Details Grid */}
                <DetailsGrid person={person} />

                {/* Activity Timeline */}
                <ActivityMiniTimeline person={person} />

                {/* Cross-navigation Links */}
                {orgId && (
                  <div className="space-y-2 pt-4 border-t border-white/10">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Navigation
                    </h3>
                    <div className="space-y-2">
                      {/* View reporting line in Org Chart */}
                      <Link
                        href={`/org/org-chart${person.departmentId ? `?departmentId=${person.departmentId}` : ""}`}
                        className={cn(
                          "flex items-center justify-between gap-2",
                          "px-3 py-2 rounded-lg",
                          "bg-muted/50 hover:bg-muted",
                          "text-sm text-foreground",
                          "transition-colors duration-150"
                        )}
                        onClick={onClose}
                      >
                        <span>View reporting line in Org Chart</span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </Link>

                      {/* View team in Structure */}
                      {person.teamId && (
                        <Link
                          href={`/org/structure?teamId=${person.teamId}`}
                          className={cn(
                            "flex items-center justify-between gap-2",
                            "px-3 py-2 rounded-lg",
                            "bg-muted/50 hover:bg-muted",
                            "text-sm text-foreground",
                            "transition-colors duration-150"
                          )}
                          onClick={onClose}
                        >
                          <span>View team in Structure</span>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      )}

                      {/* View department structure */}
                      {person.departmentId && (
                        <Link
                          href={`/org/structure?departmentId=${person.departmentId}`}
                          className={cn(
                            "flex items-center justify-between gap-2",
                            "px-3 py-2 rounded-lg",
                            "bg-muted/50 hover:bg-muted",
                            "text-sm text-foreground",
                            "transition-colors duration-150"
                          )}
                          onClick={onClose}
                        >
                          <span>View department in Structure</span>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

