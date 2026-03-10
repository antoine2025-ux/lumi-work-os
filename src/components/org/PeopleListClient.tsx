/**
 * People List Client Component
 * 
 * Displays list of people with search/filter capabilities.
 * Premium, enterprise-grade UI with no flash, instant search, and clean hierarchy.
 */

"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { getDisplayName, getPersonDisplayBadges } from "@/lib/org/personDisplay";
import { cn } from "@/lib/utils";
import { MoreVertical, Trash2, Eye, Edit, Download, Mail } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CancelInvitationButton } from "@/components/org/cancel-invitation-button";
import { CopyInviteLinkButton } from "@/components/org/copy-invite-link-button";
import { PendingProfileModal } from "@/components/org/people/PendingProfileModal";
import type { PendingInvitation } from "@/components/org/people/PendingProfileModal";
import { useCurrentOrgRole } from "@/hooks/useCurrentOrgRole";
import { useOrgUrl } from "@/hooks/useOrgUrl";
import { canRole } from "@/lib/orgPermissions";
import { useToast } from "@/components/ui/use-toast";
import type { OrgPerson } from "@/types/org";

type AvailabilityStatus = "UNKNOWN" | "AVAILABLE" | "PARTIALLY_AVAILABLE" | "UNAVAILABLE";

// Extended person type with fields from API that aren't on base OrgPerson
type ExtendedOrgPerson = OrgPerson & {
  title?: string | null;
  fullName?: string | null;
  manager?: { id: string; name: string } | null;
  topSkills?: Array<{ id: string; name: string; proficiency: number }>;
  availabilityStatus?: AvailabilityStatus | null;
  employmentStatus?: string | null;
};

// Shape of the API response data (supports multiple response envelopes)
type PeopleApiResponse = {
  ok?: boolean;
  data?: { people?: ExtendedOrgPerson[] };
  people?: ExtendedOrgPerson[];
};

type Invitation = PendingInvitation;

type PeopleListClientProps = {
  searchQuery?: string;
  hideSearch?: boolean;
  hideAddButton?: boolean;
  /** Pending invitations for the "Pending" tab (server-loaded) */
  initialInvitations?: Invitation[];
  /** Workspace ID for cancel/copy actions on pending invitations */
  workspaceId?: string;
};

export function PeopleListClient({ 
  searchQuery: externalQuery,
  hideSearch = false,
  hideAddButton = false,
  initialInvitations = [],
  workspaceId,
}: PeopleListClientProps = {}) {
  const router = useRouter();
  const orgUrl = useOrgUrl();
  const flagsQ = useOrgQuery(() => OrgApi.getFlags(), []);
  const peopleQ = useOrgQuery(() => OrgApi.listPeople(), []);
  const [internalQ, setInternalQ] = useState("");
  const q = externalQuery !== undefined ? externalQuery : internalQ;
  const { role } = useCurrentOrgRole();
  const isOwner = role === "OWNER";
  const canManagePeople = canRole(role, "managePeople");
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  // Delete modal state
  const [personToDelete, setPersonToDelete] = useState<OrgPerson | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Pending profile modal state
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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
          const response = currentData as unknown as PeopleApiResponse;
          const people = Array.isArray(currentData)
            ? currentData
            : (response?.data?.people ?? response?.people ?? []);

          const personIndex = people.findIndex((p: ExtendedOrgPerson) => p.id === updatedData.personId);
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
            } else if ((currentData as unknown as PeopleApiResponse)?.data?.people) {
              const resp = currentData as unknown as PeopleApiResponse;
              return {
                ...currentData,
                data: { ...resp.data, people: updatedPeople },
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
  const people: ExtendedOrgPerson[] = hasData
    ? (Array.isArray(peopleQ.data)
        ? peopleQ.data  // Fallback: if API returns array directly
        : (() => {
            const resp = peopleQ.data as unknown as PeopleApiResponse;
            return resp?.data?.people ?? resp?.people ?? [];
          })())
    : [];

  // Dev-only logging for debugging render state
  useEffect(() => {
    console.log("[PeopleListClient] State:", {
      isLoading,
      error: error || null,
      hasData,
      rawData: peopleQ.data,
      peopleCount: people.length,
      extractedPeople: people.slice(0, 2).map((p: typeof people[0]) => ({ id: p.id, name: p.name })),
      willShowEmpty: hasData && people.length === 0 && !q.trim(),
      willShowList: hasData && people.length > 0,
    });
  }, [isLoading, error, hasData, people.length, peopleQ.data, q]);

  // Instant client-side filtering using displayName helper
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return people;
    return people.filter((p: ExtendedOrgPerson) => {
      const displayName = getDisplayName({
        fullName: p.fullName || p.name,
        name: p.name,
        email: p.email,
      });
      const teamName = typeof p.team === "object" && p.team !== null
        ? (p.team as unknown as { name: string }).name
        : p.team;
      const deptName = typeof p.department === "object" && p.department !== null
        ? (p.department as unknown as { name: string }).name
        : p.department;
      return (
        displayName.toLowerCase().includes(needle) ||
        p.email?.toLowerCase().includes(needle) ||
        p.title?.toLowerCase().includes(needle) ||
        p.role?.toLowerCase().includes(needle) ||
        teamName?.toLowerCase().includes(needle) ||
        deptName?.toLowerCase().includes(needle)
      );
    });
  }, [people, q]);

  const canAdd = flagsQ.data?.flags?.peopleWrite === true;

  const showTabs = Boolean(workspaceId);
  const pendingCount = initialInvitations.length;

  // Pending invitations tab content (placeholder rows)
  const pendingTabContent = (
    <Card className="border-white/5 bg-card/40 overflow-hidden">
      {pendingCount === 0 ? (
        <div className="p-8 text-center">
          <Mail className="h-8 w-8 mx-auto text-slate-600 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No pending invitations</p>
          <p className="text-xs text-muted-foreground mt-1">
            Invited members will appear here until they accept.
          </p>
          {canAdd && (
            <Button asChild size="sm" className="mt-4">
              <Link href={orgUrl.newPerson}>Send invitation</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {initialInvitations.map((invitation) => {
            const displayName = invitation.fullName?.trim() || invitation.email;
            return (
            <div
              key={invitation.id}
              className="flex items-center justify-between py-4 px-6 hover:bg-muted/30"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
                  <Mail className="h-4 w-4 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInvitation(invitation);
                      setIsProfileModalOpen(true);
                    }}
                    className={cn(
                      "text-sm font-medium text-foreground truncate block text-left w-full",
                      "hover:text-primary transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                    )}
                  >
                    {displayName}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Invited by{" "}
                    {invitation.invitedBy?.name ??
                      invitation.invitedBy?.email ??
                      "Unknown"}
                    {invitation.expiresAt && (
                      <> · Expires {new Date(invitation.expiresAt).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <span className="shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Pending
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <CopyInviteLinkButton
                  token={invitation.token ?? ""}
                  inviteUrl={invitation.inviteUrl}
                />
                {workspaceId && (
                  <CancelInvitationButton
                    workspaceId={workspaceId}
                    invitationId={invitation.id}
                    email={invitation.email}
                  />
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </Card>
  );

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

  const handleExport = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const response = await fetch("/api/org/people/export", { credentials: "include" });
      if (!response.ok) {
        toast({ variant: "destructive", title: "Export failed", description: "Could not download people export." });
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `people-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ description: "Export downloaded" });
    } catch {
      toast({ variant: "destructive", title: "Export failed", description: "Could not download people export." });
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, toast]);

  // Show skeleton while loading (no flash of empty state)
  // CRITICAL: Only show skeleton when actively loading AND we don't have cached data
  if (isLoading && !hasData) {
    const loadingContent = (
      <>
        {!hideSearch && (
          <div className="flex items-center justify-between gap-3">
            <Input
              value={q}
              onChange={(e) => setInternalQ(e.target.value)}
              placeholder="Search people…"
              className="flex-1"
              disabled
            />
            <div className="flex items-center gap-2">
              {canManagePeople && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  {isExporting ? "Exporting…" : "Export CSV"}
                </Button>
              )}
              {!hideAddButton && canAdd && (
                <Button asChild>
                  <Link href={orgUrl.newPerson}>Add person</Link>
                </Button>
              )}
            </div>
          </div>
        )}
        <Card className="border-white/5 bg-card/40">
          <PeopleListSkeleton />
        </Card>
      </>
    );
    if (showTabs) {
      return (
        <div className="space-y-4">
          <Tabs defaultValue="people" className="w-full">
            <TabsList className="mb-4 bg-card/50">
              <TabsTrigger value="people">People</TabsTrigger>
              <TabsTrigger value="pending">
                Pending {pendingCount > 0 && `(${pendingCount})`}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="people" className="mt-0 space-y-4">
              {loadingContent}
            </TabsContent>
            <TabsContent value="pending" className="mt-0">
              {pendingTabContent}
            </TabsContent>
          </Tabs>
          <PendingProfileModal
            invitation={selectedInvitation}
            open={isProfileModalOpen}
            onOpenChange={setIsProfileModalOpen}
            workspaceId={workspaceId}
            onCancelSuccess={() => setSelectedInvitation(null)}
          />
        </div>
      );
    }
    return <div className="space-y-4">{loadingContent}</div>;
  }

  // Show error state
  if (error) {
    const errorContent = (
      <>
        {!hideSearch && (
          <div className="flex items-center justify-between gap-3">
            <Input
              value={q}
              onChange={(e) => setInternalQ(e.target.value)}
              placeholder="Search people…"
              className="flex-1"
            />
            <div className="flex items-center gap-2">
              {canManagePeople && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  {isExporting ? "Exporting…" : "Export CSV"}
                </Button>
              )}
              {!hideAddButton && canAdd && (
                <Button asChild>
                  <Link href={orgUrl.newPerson}>Add person</Link>
                </Button>
              )}
            </div>
          </div>
        )}
        <Card className="border-white/5 bg-card/40 p-6">
          <div className="text-sm text-destructive">Failed to load people: {String(error)}</div>
        </Card>
      </>
    );
    if (showTabs) {
      return (
        <div className="space-y-4">
          <Tabs defaultValue="people" className="w-full">
            <TabsList className="mb-4 bg-card/50">
              <TabsTrigger value="people">People</TabsTrigger>
              <TabsTrigger value="pending">
                Pending {pendingCount > 0 && `(${pendingCount})`}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="people" className="mt-0 space-y-4">
              {errorContent}
            </TabsContent>
            <TabsContent value="pending" className="mt-0">
              {pendingTabContent}
            </TabsContent>
          </Tabs>
          <PendingProfileModal
            invitation={selectedInvitation}
            open={isProfileModalOpen}
            onOpenChange={setIsProfileModalOpen}
            workspaceId={workspaceId}
            onCancelSuccess={() => setSelectedInvitation(null)}
          />
        </div>
      );
    }
    return <div className="space-y-4">{errorContent}</div>;
  }

  // Safety check: if we're not loading, have no error, but also have no data, something went wrong
  // Show error state instead of empty state
  if (!isLoading && !hasData && !error) {
    const noDataContent = (
      <>
        {!hideSearch && (
          <div className="flex items-center justify-between gap-3">
            <Input
              value={q}
              onChange={(e) => setInternalQ(e.target.value)}
              placeholder="Search people…"
              className="flex-1"
            />
            <div className="flex items-center gap-2">
              {canManagePeople && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  {isExporting ? "Exporting…" : "Export CSV"}
                </Button>
              )}
              {!hideAddButton && canAdd && (
                <Button asChild>
                  <Link href={orgUrl.newPerson}>Add person</Link>
                </Button>
              )}
            </div>
          </div>
        )}
        <Card className="border-white/5 bg-card/40 p-6">
          <div className="text-sm text-muted-foreground">Loading people…</div>
        </Card>
      </>
    );
    if (showTabs) {
      return (
        <div className="space-y-4">
          <Tabs defaultValue="people" className="w-full">
            <TabsList className="mb-4 bg-card/50">
              <TabsTrigger value="people">People</TabsTrigger>
              <TabsTrigger value="pending">
                Pending {pendingCount > 0 && `(${pendingCount})`}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="people" className="mt-0 space-y-4">
              {noDataContent}
            </TabsContent>
            <TabsContent value="pending" className="mt-0">
              {pendingTabContent}
            </TabsContent>
          </Tabs>
          <PendingProfileModal
            invitation={selectedInvitation}
            open={isProfileModalOpen}
            onOpenChange={setIsProfileModalOpen}
            workspaceId={workspaceId}
            onCancelSuccess={() => setSelectedInvitation(null)}
          />
        </div>
      );
    }
    return <div className="space-y-4">{noDataContent}</div>;
  }

  // Show empty state only when we have loaded data AND people count is 0 (no flash)
  // IMPORTANT: Only show empty state after data has been loaded, not during initial render
  // Also ensure we're not in a filtered state (q should be empty for true empty state)
  if (hasData && people.length === 0 && !q.trim()) {
    const emptyContent = (
      <>
        {!hideSearch && (
          <div className="flex items-center justify-between gap-3">
            <Input
              value={q}
              onChange={(e) => setInternalQ(e.target.value)}
              placeholder="Search people…"
              className="flex-1"
              disabled
            />
            <div className="flex items-center gap-2">
              {canManagePeople && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  {isExporting ? "Exporting…" : "Export CSV"}
                </Button>
              )}
              {!hideAddButton && canAdd && (
                <Button asChild>
                  <Link href={orgUrl.newPerson}>Add person</Link>
                </Button>
              )}
            </div>
          </div>
        )}
        <PeopleEmptyState
          hasFilters={false}
          onAddPerson={() => {
            router.push(orgUrl.newPerson);
          }}
        />
      </>
    );
    if (showTabs) {
      return (
        <div className="space-y-4">
          <Tabs defaultValue="people" className="w-full">
            <TabsList className="mb-4 bg-card/50">
              <TabsTrigger value="people">People</TabsTrigger>
              <TabsTrigger value="pending">
                Pending {pendingCount > 0 && `(${pendingCount})`}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="people" className="mt-0 space-y-4">
              {emptyContent}
            </TabsContent>
            <TabsContent value="pending" className="mt-0">
              {pendingTabContent}
            </TabsContent>
          </Tabs>
          <PendingProfileModal
            invitation={selectedInvitation}
            open={isProfileModalOpen}
            onOpenChange={setIsProfileModalOpen}
            workspaceId={workspaceId}
            onCancelSuccess={() => setSelectedInvitation(null)}
          />
        </div>
      );
    }
    return <div className="space-y-4">{emptyContent}</div>;
  }

  // Main content for People tab
  const peopleContent = (
    <>
      {!hideSearch && (
        <div className="flex items-center justify-between gap-3">
          <Input
            value={q}
            onChange={(e) => setInternalQ(e.target.value)}
            placeholder="Search people…"
            className="flex-1"
          />
          <div className="flex items-center gap-2">
            {canManagePeople && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
              >
                <Download className="h-4 w-4 mr-1.5" />
                {isExporting ? "Exporting…" : "Export CSV"}
              </Button>
            )}
            {!hideAddButton && canAdd && (
              <Button asChild>
                <Link href={orgUrl.newPerson}>Add person</Link>
              </Button>
            )}
          </div>
        </div>
      )}

      <Card className="border-white/5 bg-card/40 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8">
            <PeopleEmptyState
              hasFilters={true}
              onResetSearch={() => setInternalQ("")}
            />
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((person: ExtendedOrgPerson) => {
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
                    "hover:bg-muted/50",
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
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground border border-white/5">
                        {badges.teamLabel}
                      </span>
                    )}

                    {/* Top skills (up to 3) */}
                    {person.topSkills && person.topSkills.length > 0 && (
                      <div className="flex items-center gap-1">
                        {person.topSkills.slice(0, 3).map((skill) => (
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
                            className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-muted/35 text-muted-foreground border border-white/5 hover:bg-muted/50 hover:text-muted-foreground transition-colors cursor-pointer"
                            title="Click to assign a manager"
                          >
                            {badges.issueLabel}
                          </button>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-muted/35 text-muted-foreground border border-white/5">
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
    </>
  );

  // Wrap with tabs when workspaceId is provided
  if (showTabs) {
    return (
      <div className="space-y-4">
        <Tabs defaultValue="people" className="w-full">
          <TabsList className="mb-4 bg-card/50">
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="pending">
              Pending {pendingCount > 0 && `(${pendingCount})`}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="people" className="mt-0 space-y-4">
            {peopleContent}
          </TabsContent>
          <TabsContent value="pending" className="mt-0">
            {pendingTabContent}
          </TabsContent>
        </Tabs>
        <PendingProfileModal
          invitation={selectedInvitation}
          open={isProfileModalOpen}
          onOpenChange={setIsProfileModalOpen}
          workspaceId={workspaceId}
          onCancelSuccess={() => setSelectedInvitation(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {peopleContent}
    </div>
  );
}
