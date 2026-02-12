/**
 * People List Client Component
 * 
 * Displays list of people with search/filter capabilities.
 * Premium, enterprise-grade UI with no flash, instant search, and clean hierarchy.
 */

"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AvailabilityPill } from "@/components/org/AvailabilityPill";
import { PeopleListSkeleton } from "@/components/org/people/PeopleListSkeleton";
import { PeopleEmptyState } from "@/components/org/people/PeopleEmptyState";
import { PersonIdentityCell } from "@/components/org/people/PersonIdentityCell";
import { DeletePersonModal } from "@/components/org/people/DeletePersonModal";
import { getDisplayName, displayTeamDept, getPersonDisplayBadges } from "@/lib/org/personDisplay";
import { cn } from "@/lib/utils";
import { MoreVertical, Trash2, Eye, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentOrgRole } from "@/hooks/useCurrentOrgRole";
import { useOrgUrl } from "@/hooks/useOrgUrl";
import type { OrgPerson } from "@/types/org";

export function PeopleListClient() {
  const pathname = usePathname();
  const router = useRouter();
  const orgUrl = useOrgUrl();
  const flagsQ = useOrgQuery(() => OrgApi.getFlags(), []);
  const peopleQ = useOrgQuery(() => OrgApi.listPeople(), []);
  const [q, setQ] = useState("");
  const { role } = useCurrentOrgRole();
  const isOwner = role === "OWNER";
  
  // Delete modal state
  const [personToDelete, setPersonToDelete] = useState<OrgPerson | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Store refetch function and updateData in refs to avoid dependency issues
  const refetchRef = useRef(peopleQ.refetch);
  refetchRef.current = peopleQ.refetch;
  
  const updateDataRef = useRef(peopleQ.updateData);
  updateDataRef.current = peopleQ.updateData;

  // Refetch when person is created or updated (not on every pathname change to prevent loops)
  useEffect(() => {
    const handlePersonCreated = () => {
      console.log("[PeopleListClient] Person created event received, refetching...");
      // Always refetch, regardless of pathname, to keep data fresh
      refetchRef.current();
    };
    
    const handlePersonUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      const updatedData = customEvent.detail;
      console.log("[PeopleListClient] Person updated event received", updatedData);
      
      // Optimistic update: immediately update the person in the list if we have the data
      if (updatedData?.personId && updateDataRef.current) {
        updateDataRef.current((currentData) => {
          if (!currentData) return currentData;
          
          // Support both { ok, data: { people } } and { people } shapes
          const people = Array.isArray(currentData) 
            ? currentData 
            : ((currentData as any)?.data?.people ?? (currentData as any)?.people ?? []);
          
          const personIndex = people.findIndex((p: any) => p.id === updatedData.personId);
          if (personIndex !== -1) {
            // Update the person's manager in the local data
            const updatedPeople = [...people];
            updatedPeople[personIndex] = {
              ...updatedPeople[personIndex],
              manager: updatedData.manager,
            };
            
            // Return updated data structure preserving original shape
            if (Array.isArray(currentData)) {
              return updatedPeople as typeof currentData;
            } else if ((currentData as any)?.data?.people) {
              return {
                ...currentData,
                data: { ...(currentData as any).data, people: updatedPeople },
              } as typeof currentData;
            } else {
              return {
                ...currentData,
                people: updatedPeople,
              } as typeof currentData;
            }
          }
          
          return currentData;
        });
      }
      
      // Always refetch in background to ensure data is fresh
      refetchRef.current();
    };

    window.addEventListener("org:person:created", handlePersonCreated);
    window.addEventListener("org:person:updated", handlePersonUpdated);

    // Cleanup event listeners on unmount
    return () => {
      window.removeEventListener("org:person:created", handlePersonCreated);
      window.removeEventListener("org:person:updated", handlePersonUpdated);
    };
  }, []); // Empty deps - we want this to run once and listen to all events

  const isLoading = peopleQ.loading;
  const error = peopleQ.error;
  const hasData = peopleQ.data !== null && peopleQ.data !== undefined;
  
  // Extract people array from API response - API returns { ok, data: { people: [...] } }
  // The API route returns OrgPeopleListDTO which is { people: Array<...> }
  const people = hasData 
    ? (Array.isArray(peopleQ.data) 
        ? peopleQ.data  // Fallback: if API returns array directly
        : ((peopleQ.data as any)?.data?.people ?? (peopleQ.data as any)?.people ?? []))  // Support { ok, data: { people } } and { people }
    : [];

  // Dev-only logging for debugging render state
  useEffect(() => {
    console.log("[PeopleListClient] State:", {
      isLoading,
      error: error || null,
      hasData,
      rawData: peopleQ.data,
      peopleCount: people.length,
      extractedPeople: people.slice(0, 2).map(p => ({ id: p.id, name: p.name })),
      willShowEmpty: hasData && people.length === 0 && !q.trim(),
      willShowList: hasData && people.length > 0,
    });
  }, [isLoading, error, hasData, people.length, peopleQ.data, q]);

  // Instant client-side filtering using displayName helper
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return people;
    return people.filter((p) => {
      const displayName = getDisplayName({
        fullName: (p as any).fullName || p.name,
        name: p.name,
        email: p.email,
      });
      return (
        displayName.toLowerCase().includes(needle) ||
        p.email?.toLowerCase().includes(needle) ||
        p.title?.toLowerCase().includes(needle) ||
        p.role?.toLowerCase().includes(needle) ||
        (typeof p.team === "object" && p.team !== null ? (p.team as any).name : p.team)?.toLowerCase().includes(needle) ||
        (typeof p.department === "object" && p.department !== null ? (p.department as any).name : p.department)?.toLowerCase().includes(needle)
      );
    });
  }, [people, q]);

  const canAdd = flagsQ.data?.flags?.peopleWrite === true;

  // Handle row click navigation (workspace-scoped when in /w/[workspaceSlug]/org)
  const handleRowClick = useCallback(
    (person: OrgPerson) => {
      router.push(orgUrl.person(person.id));
    },
    [router, orgUrl]
  );

  const handleRowKeyDown = useCallback((person: OrgPerson, e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleRowClick(person);
    }
  }, [handleRowClick]);

  // Delete person handler
  const handleDeletePerson = useCallback((person: OrgPerson) => {
    setPersonToDelete(person);
    setIsDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!personToDelete) return;

    try {
      const response = await fetch(`/api/org/people/${personToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.hint || error.error || "Failed to delete person");
      }

      // Close modal
      setIsDeleteModalOpen(false);
      setPersonToDelete(null);

      // Refresh the list
      peopleQ.refetch();
    } catch (error) {
      console.error("Failed to delete person:", error);
      alert(error instanceof Error ? error.message : "Failed to delete person");
    }
  }, [personToDelete, peopleQ]);

  // Show skeleton while loading (no flash of empty state)
  // CRITICAL: Only show skeleton when actively loading AND we don't have cached data
  if (isLoading && !hasData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people…"
            className="flex-1"
            disabled
          />
          {canAdd ? (
            <Button asChild>
              <Link href={orgUrl.newPerson}>Add person</Link>
            </Button>
          ) : (
            <Button variant="secondary" disabled title="Enabled via feature flag">
              Add person
            </Button>
          )}
        </div>

        <Card className="border-white/5 bg-slate-900/40">
          <PeopleListSkeleton />
        </Card>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people…"
            className="flex-1"
          />
          {canAdd ? (
            <Button asChild>
              <Link href={orgUrl.newPerson}>Add person</Link>
            </Button>
          ) : (
            <Button variant="secondary" disabled title="Enabled via feature flag">
              Add person
            </Button>
          )}
        </div>
        <Card className="border-white/5 bg-slate-900/40 p-6">
          <div className="text-sm text-destructive">Failed to load people: {String(error)}</div>
        </Card>
      </div>
    );
  }

  // Safety check: if we're not loading, have no error, but also have no data, something went wrong
  // Show error state instead of empty state
  if (!isLoading && !hasData && !error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people…"
            className="flex-1"
          />
          {canAdd ? (
            <Button asChild>
              <Link href={orgUrl.newPerson}>Add person</Link>
            </Button>
          ) : (
            <Button variant="secondary" disabled title="Enabled via feature flag">
              Add person
            </Button>
          )}
        </div>
        <Card className="border-white/5 bg-slate-900/40 p-6">
          <div className="text-sm text-slate-400">Loading people…</div>
        </Card>
      </div>
    );
  }

  // Show empty state only when we have loaded data AND people count is 0 (no flash)
  // IMPORTANT: Only show empty state after data has been loaded, not during initial render
  // Also ensure we're not in a filtered state (q should be empty for true empty state)
  if (hasData && people.length === 0 && !q.trim()) {
    console.log("[PeopleListClient] Showing empty state - hasData:", hasData, "people.length:", people.length, "q:", q);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people…"
            className="flex-1"
            disabled
          />
          {canAdd ? (
            <Button asChild>
              <Link href={orgUrl.newPerson}>Add person</Link>
            </Button>
          ) : (
            <Button variant="secondary" disabled title="Enabled via feature flag">
              Add person
            </Button>
          )}
        </div>

        <PeopleEmptyState
          hasFilters={false}
          onAddPerson={() => {
            router.push(orgUrl.newPerson);
          }}
        />
      </div>
    );
  }

  // Show filtered empty state or list
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people…"
          className="flex-1"
        />
        {canAdd ? (
          <Button asChild>
            <Link href="/org/people/new">Add person</Link>
          </Button>
        ) : (
          <Button variant="secondary" disabled title="Enabled via feature flag">
            Add person
          </Button>
        )}
      </div>

      <Card className="border-white/5 bg-slate-900/40 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8">
            <PeopleEmptyState
              hasFilters={true}
              onResetSearch={() => setQ("")}
            />
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((person) => {
              // Get display badges (team label and issue label)
              const badges = getPersonDisplayBadges({
                team: person.team,
                department: person.department,
                title: person.title,
                role: person.role,
                manager: person.manager,
                managerId: person.manager?.id, // Use manager.id as managerId
              });

              return (
                <div
                  key={person.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleRowClick(person)}
                  onKeyDown={(e) => handleRowKeyDown(person, e)}
                  className={cn(
                    "flex items-center justify-between",
                    "py-4 px-6",
                    "hover:bg-slate-800/50",
                    "group transition-all duration-150",
                    "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  )}
                >
                  {/* Left: Avatar + Name + Title (2 lines max) */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <PersonIdentityCell person={person} />
                  </div>

                  {/* Middle: Team label + Skills + Availability badges */}
                  <div className="hidden md:flex items-center gap-2 mx-4 flex-shrink-0">
                    {/* Team label */}
                    {badges.teamLabel && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800/50 text-slate-400 border border-white/5">
                        {badges.teamLabel}
                      </span>
                    )}

                    {/* Top skills (up to 3) */}
                    {(person as any).topSkills?.length > 0 && (
                      <div className="flex items-center gap-1">
                        {(person as any).topSkills.slice(0, 3).map((skill: { id: string; name: string; proficiency: number }) => (
                          <span
                            key={skill.id}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            title={`Proficiency: ${skill.proficiency}/5`}
                          >
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Employment status badge (only if not ACTIVE) */}
                    {person.employmentStatus && person.employmentStatus !== "ACTIVE" && (
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                        person.employmentStatus === "ON_LEAVE" 
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : person.employmentStatus === "TERMINATED"
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      )}>
                        {person.employmentStatus === "ON_LEAVE" ? "On Leave" 
                          : person.employmentStatus === "TERMINATED" ? "Terminated" 
                          : "Contractor"}
                      </span>
                    )}

                    {/* Availability badge from existing status */}
                    {person.availabilityStatus && person.availabilityStatus !== "UNKNOWN" && (
                      <AvailabilityPill status={person.availabilityStatus} subtle />
                    )}
                  </div>

                  {/* Right: Issue label + Kebab menu */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Issue label (single specific indicator) */}
                    {badges.issueLabel && (
                      <div className="hidden md:flex items-center">
                        {badges.issueLabel === "Needs manager" ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`${orgUrl.person(person.id)}?focus=manager`);
                            }}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-slate-800/35 text-slate-500 border border-white/5 hover:bg-slate-800/50 hover:text-slate-400 transition-colors cursor-pointer"
                            title="Click to assign a manager"
                          >
                            {badges.issueLabel}
                          </button>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-slate-800/35 text-slate-500 border border-white/5">
                            {badges.issueLabel}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Kebab menu (always visible, actions depend on permissions) */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "flex items-center justify-center",
                            "h-7 w-7 rounded",
                            "text-slate-500 hover:text-slate-300",
                            "hover:bg-slate-800/50",
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
                        className="w-48 bg-slate-900 border-slate-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(person);
                          }}
                          className="cursor-pointer"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(person);
                          }}
                          className="cursor-pointer"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {isOwner && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePerson(person);
                            }}
                            className="text-red-400 focus:text-red-300 focus:bg-red-950/20 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete person…
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Delete Person Modal */}
      <DeletePersonModal
        person={personToDelete}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setPersonToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
