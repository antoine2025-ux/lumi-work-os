"use client";

import React, { useState, useEffect, useMemo, memo, useCallback, useRef, useDeferredValue, startTransition } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { OrgNoAccessState } from "@/components/org/OrgNoAccessState";
import { PeopleFiltersBar } from "@/components/org/people/PeopleFiltersBar";
import { PeopleFiltersDrawer } from "@/components/org/people/PeopleFiltersDrawer";
import { ActiveFiltersChips } from "@/components/org/people/ActiveFiltersChips";
import { SavedViewsDropdown } from "@/components/org/people/SavedViewsDropdown";
import { PeopleEmptyState } from "@/components/org/people/PeopleEmptyState";
import { parsePeopleFiltersFromSearchParams, hasAnyPeopleFilter, buildPeopleFiltersURL, type PeopleFilters } from "@/components/org/people/people-filters";
import { useOrgStructureLists } from "@/hooks/useOrgStructureLists";
import { useCurrentOrgRole } from "@/hooks/useCurrentOrgRole";
import { canRole } from "@/lib/orgPermissions";
import { useOrgPeopleDirectory } from "@/hooks/useOrgPeopleDirectory";
import { isOrgNoAccessError } from "@/lib/orgErrorUtils";
import { OrgCapabilityGate } from "@/components/org/OrgCapabilityGate";
import { useOrgPermissions } from "@/components/org/OrgPermissionsContext";
import { loadOrgPreferences, saveOrgPreferences } from "@/lib/org/preferences.client";
import { PeopleTable } from "@/components/org/people/PeopleTable";
import { PeopleInsights } from "@/components/org/people/PeopleInsights";
import { PeopleTableCard } from "@/components/org/people/PeopleTableCard";
import { PersonProfileDrawer } from "@/components/org/people/PersonProfileDrawer";
import { PeopleInsightsPanel } from "@/components/org/people/PeopleInsightsPanel";
import { PeopleInsightsDrawer } from "@/components/org/people/PeopleInsightsDrawer";
import { PeopleCardsGrid } from "@/components/org/people/PeopleCardsGrid";
import { PeopleSelectionBar } from "@/components/org/people/PeopleSelectionBar";
import { ShortlistModal } from "@/components/org/people/ShortlistModal";
import { ShortlistsDropdown } from "@/components/org/people/ShortlistsDropdown";
import { CompareModal } from "@/components/org/people/CompareModal";
import { DeletePersonModal } from "@/components/org/people/DeletePersonModal";
import { usePeopleSelection } from "@/hooks/usePeopleSelection";
import { useShortlists } from "@/hooks/useShortlists";
import { PeopleHelpPopover } from "@/components/org/people/PeopleHelpPopover";
import { PeopleStateSummary } from "@/components/org/people/PeopleStateSummary";
import { PeopleActionsMenu } from "@/components/org/people/PeopleActionsMenu";
import { BulkAssignModal } from "@/components/org/people/BulkAssignModal";
import { BarChart3, X } from "lucide-react";
import type { OrgPerson } from "@/types/org";
import type { ViewMode } from "@/components/org/people/PeopleViewToggle";

type PeoplePageClientProps = {
  orgId: string;
  initialPeople: OrgPerson[];
  initialTotal?: number;
  initialPage?: number;
  initialPageSize?: number;
  initialTotalPages?: number;
};

export function PeoplePageClient({ orgId, initialPeople }: PeoplePageClientProps) {
  const { role } = useCurrentOrgRole();
  const canManagePeople = canRole(role, "managePeople");
  const isOwner = role === "OWNER";
  const perms = useOrgPermissions();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { teams, departments, roles, isLoading: isStructureLoading } = useOrgStructureLists();
  
  // Load persistent preferences
  const [prefs, setPrefs] = useState<Record<string, any>>({});
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  
  useEffect(() => {
    loadOrgPreferences().then((loaded) => {
      setPrefs(loaded);
      setPrefsLoaded(true);
    });
  }, []);
  
  // Parse filters from URL
  const filters = parsePeopleFiltersFromSearchParams(searchParams);
  
  // Local search input state (immediate updates for responsive typing)
  const [searchInput, setSearchInput] = useState<string>(filters.q || "");
  
  // Use deferred value for search to keep input responsive while filtering happens in background
  const deferredSearch = useDeferredValue(searchInput);
  
  // Sync deferredSearch to URL (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (deferredSearch !== (filters.q || "")) {
        updateFiltersURL({ q: deferredSearch.trim() || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [deferredSearch]);
  
  // Filters drawer state
  const [isFiltersDrawerOpen, setIsFiltersDrawerOpen] = useState(false);
  
  // Insights drawer state (mobile)
  const [isInsightsDrawerOpen, setIsInsightsDrawerOpen] = useState(false);
  
  // View mode state (cards or table)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "cards";
    try {
      const stored = localStorage.getItem("org.people.viewMode");
      return stored === "table" ? "table" : "cards";
    } catch {
      return "cards";
    }
  });

  // Selection state
  const {
    selectedIds,
    selectedCount,
    toggleSelection,
    clearSelection,
    isSelected,
  } = usePeopleSelection();

  // Shortlists
  const { shortlists, createShortlist, deleteShortlist, getShortlist } = useShortlists();
  const [activeShortlistId, setActiveShortlistId] = useState<string | undefined>(undefined);
  const [isShortlistModalOpen, setIsShortlistModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [bulkAssignModal, setBulkAssignModal] = useState<{ type: "team" | "department" | "manager"; isOpen: boolean }>({
    type: "team",
    isOpen: false,
  });
  
  // Ref for scrolling to top
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // Scroll position preservation when switching views
  const scrollPositionRef = useRef<number>(0);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  
  // Sync search input with URL query param on mount
  useEffect(() => {
    const q = searchParams.get("q") || "";
    if (q !== searchInput) {
      setSearchInput(q);
    }
  }, [searchParams]);

  // Update URL with new filters
  const updateFiltersURL = useCallback((newFilters: Partial<PeopleFilters>) => {
    const updatedFilters: PeopleFilters = {
      ...filters,
      ...newFilters,
    };
    const url = buildPeopleFiltersURL(updatedFilters);
    router.push(`/org/people${url ? `?${url}` : ""}`, { scroll: false });
  }, [filters, router]);

  // Sync deferredSearch to URL (debounced) - only update URL, not state
  useEffect(() => {
    const timer = setTimeout(() => {
      if (deferredSearch !== (filters.q || "")) {
        updateFiltersURL({ q: deferredSearch.trim() || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [deferredSearch, filters.q, updateFiltersURL]);

  // Use filters WITHOUT search query for API calls (search is client-side)
  const filtersWithoutSearch = useMemo(() => ({
    teamId: filters.teamId,
    departmentId: filters.departmentId,
    roleId: filters.roleId,
  }), [filters.teamId, filters.departmentId, filters.roleId]);

  // Refresh trigger to force re-fetch when person is created
  const [refreshKey, setRefreshKey] = useState(0);

  // Load people with non-search filters (team, department, role) via API
  const { people: apiPeople, isLoading: isPeopleLoading, error } = useOrgPeopleDirectory(filtersWithoutSearch, { refreshKey });
  const noAccess = isOrgNoAccessError(error);

  // Use API data if available, otherwise fall back to initial data
  const basePeople = apiPeople ?? initialPeople;

  // Listen for person creation events to refresh the list
  useEffect(() => {
    const handlePersonCreated = () => {
      // Trigger a refresh by updating refresh key
      // This will cause the useOrgPeopleDirectory effect to re-run
      // Small delay to ensure the API has processed the creation
      setTimeout(() => {
        setRefreshKey((prev) => prev + 1);
        router.refresh();
      }, 300);
    };

    window.addEventListener("org:person:created", handlePersonCreated);
    return () => {
      window.removeEventListener("org:person:created", handlePersonCreated);
    };
  }, [router]);

  // Memoize peopleById map for O(1) lookups
  const peopleById = useMemo(() => {
    const map = new Map<string, OrgPerson>();
    basePeople.forEach((person) => {
      map.set(person.id, person);
    });
    return map;
  }, [basePeople]);

  // Memoize lookup maps for department/team names
  const departmentIdToName = useMemo(() => {
    const map = new Map<string, string>();
    departments?.forEach((dept) => {
      map.set(dept.id, dept.name);
    });
    return map;
  }, [departments]);

  const teamIdToName = useMemo(() => {
    const map = new Map<string, string>();
    teams?.forEach((team) => {
      map.set(team.id, team.name);
    });
    return map;
  }, [teams]);

  // Person drawer state - use ID instead of full object to prevent rerenders
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Delete modal state
  const [personToDelete, setPersonToDelete] = useState<OrgPerson | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Derive selected person from map
  const selectedPerson = useMemo(() => {
    return selectedPersonId ? peopleById.get(selectedPersonId) || null : null;
  }, [selectedPersonId, peopleById]);

  const handleRowClick = useCallback((person: OrgPerson) => {
    startTransition(() => {
      setSelectedPersonId(person.id);
      setIsDrawerOpen(true);
    });
  }, []);

  const handleManagerClick = useCallback((managerId: string) => {
    const manager = basePeople.find((p) => p.id === managerId);
    if (manager) {
      handleRowClick(manager);
    }
  }, [basePeople, handleRowClick]);

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    // Keep selectedPersonId for smooth close animation
    setTimeout(() => setSelectedPersonId(null), 200);
  }, []);

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
      setRefreshKey((prev) => prev + 1);
      router.refresh();

      // If the deleted person was selected in the drawer, close it
      if (selectedPersonId === personToDelete.id) {
        handleCloseDrawer();
      }
    } catch (error) {
      console.error("Failed to delete person:", error);
      // You could show a toast notification here
      alert(error instanceof Error ? error.message : "Failed to delete person");
    }
  }, [personToDelete, selectedPersonId, handleCloseDrawer, router]);

  // Apply shortlist filter if active
  const shortlistFilteredPeople = useMemo(() => {
    if (!activeShortlistId) return basePeople;
    const shortlist = shortlists.find((s) => s.id === activeShortlistId);
    if (!shortlist) return basePeople;
    const shortlistIds = new Set(shortlist.personIds);
    return basePeople.filter((p) => shortlistIds.has(p.id));
  }, [basePeople, activeShortlistId, shortlists]);

  // Client-side filtering and sorting with memoization
  // Use deferredSearch for smooth typing experience
  const displayPeople = useMemo(() => {
    const startTime = process.env.NODE_ENV !== "production" ? performance.now() : 0;
    
    let result = shortlistFilteredPeople;

    // Apply search filter using deferred value
    if (deferredSearch.trim()) {
      const query = deferredSearch.toLowerCase().trim();
      result = result.filter((person) => {
        return (
          person.name?.toLowerCase().includes(query) ||
          person.email?.toLowerCase().includes(query) ||
          person.role?.toLowerCase().includes(query) ||
          person.team?.toLowerCase().includes(query) ||
          person.department?.toLowerCase().includes(query)
        );
      });
    }

    // Apply quick chip filters
    if (filters.quickChip && filters.quickChip !== "all") {
      switch (filters.quickChip) {
        case "leaders":
          // TODO: Implement when managerId/directReports data is available
          // For now, filter by role containing "lead", "manager", "director", etc.
          result = result.filter((person) => {
            const role = person.role?.toLowerCase() || "";
            return (
              role.includes("lead") ||
              role.includes("manager") ||
              role.includes("director") ||
              role.includes("head") ||
              role.includes("chief")
            );
          });
          break;
        case "unassigned":
          result = result.filter((person) => !person.teamId && !person.departmentId);
          break;
        case "new":
          // TODO: Implement when joinedAt data is available
          // Filter by joinedAt within last 30 days
          break;
        case "recentlyChanged":
          // TODO: Implement when change history is available
          break;
      }
    }

    // Apply flag filters
    if (filters.leadersOnly) {
      result = result.filter((person) => {
        const role = person.role?.toLowerCase() || "";
        return (
          role.includes("lead") ||
          role.includes("manager") ||
          role.includes("director") ||
          role.includes("head") ||
          role.includes("chief")
        );
      });
    }

    if (filters.unassignedOnly) {
      result = result.filter((person) => !person.teamId && !person.departmentId);
    }

    // Note: recentlyChanged filter would go here when data is available

    // Apply sorting
    const sortField = filters.sort || "name";
    const sortDirection = filters.direction || "asc";

    result = [...result].sort((a, b) => {
      let aValue: string | null = null;
      let bValue: string | null = null;

      switch (sortField) {
        case "name":
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
          break;
        case "role":
          aValue = a.role?.toLowerCase() || "";
          bValue = b.role?.toLowerCase() || "";
          break;
        case "joinedAt":
          aValue = a.joinedAt || "";
          bValue = b.joinedAt || "";
          break;
        default:
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    // Performance logging (dev only)
    if (process.env.NODE_ENV !== "production" && startTime) {
      const duration = performance.now() - startTime;
      if (duration > 50) {
        console.log(`[PeoplePage] Filtering took ${duration.toFixed(2)}ms for ${result.length} people`);
      }
    }

    return result;
  }, [shortlistFilteredPeople, deferredSearch, filters.quickChip, filters.leadersOnly, filters.unassignedOnly, filters.sort, filters.direction]);

  // Handle search input change (immediate, no debounce for responsive typing)
  // useDeferredValue handles the deferral automatically
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    // Save to preferences (non-blocking)
    try {
      saveOrgPreferences({ peopleSearch: value });
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Quick chip change handler
  const handleQuickChipChange = useCallback((chip: typeof filters.quickChip) => {
    updateFiltersURL({ quickChip: chip });
  }, [updateFiltersURL]);

  // Filters drawer handlers
  const handleFiltersChange = useCallback((newFilters: Partial<PeopleFilters>) => {
    startTransition(() => {
      updateFiltersURL(newFilters);
    });
  }, [updateFiltersURL]);

  const handleResetSearch = useCallback(() => {
    setSearchInput("");
    startTransition(() => {
      updateFiltersURL({ q: undefined });
    });
  }, [updateFiltersURL]);

  const handleClearAllFilters = useCallback(() => {
    setSearchInput("");
    startTransition(() => {
      updateFiltersURL({
        q: undefined,
        quickChip: "all",
        teamId: undefined,
        departmentId: undefined,
        roleId: undefined,
        managerId: undefined,
        leadersOnly: undefined,
        unassignedOnly: undefined,
        recentlyChanged: undefined,
      });
    });
  }, [updateFiltersURL]);

  const handleRemoveFilter = useCallback((key: keyof PeopleFilters) => {
    startTransition(() => {
      updateFiltersURL({ [key]: undefined });
    });
  }, [updateFiltersURL]);

  // Saved views handler
  const handleViewSelect = useCallback((viewFilters: PeopleFilters) => {
    setSearchInput(viewFilters.q || "");
    updateFiltersURL(viewFilters);
  }, [updateFiltersURL]);

  // View mode change handler with scroll preservation
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    // Save current scroll position
    if (resultsContainerRef.current) {
      scrollPositionRef.current = resultsContainerRef.current.scrollTop;
    }

    startTransition(() => {
      setViewMode(mode);
      try {
        localStorage.setItem("org.people.viewMode", mode);
      } catch {
        // Ignore storage errors
      }

      // Restore scroll position after render
      requestAnimationFrame(() => {
        if (resultsContainerRef.current) {
          resultsContainerRef.current.scrollTop = scrollPositionRef.current;
        }
      });
    });
  }, []);

  // Team/Department click handlers for cards
  const handleTeamClick = useCallback((teamId: string) => {
    updateFiltersURL({ teamId });
  }, [updateFiltersURL]);

  const handleDepartmentClick = useCallback((departmentId: string) => {
    updateFiltersURL({ departmentId });
  }, [updateFiltersURL]);

  // Shortlist handlers
  const handleSaveShortlist = useCallback((name: string) => {
    createShortlist(name, selectedIds);
    clearSelection();
  }, [createShortlist, selectedIds, clearSelection]);

  const handleSelectShortlist = useCallback((shortlistId: string) => {
    setActiveShortlistId(shortlistId);
  }, []);

  const handleClearShortlist = useCallback(() => {
    setActiveShortlistId(undefined);
  }, []);

  // Compare handlers
  const handleCompare = useCallback(() => {
    if (selectedIds.length >= 2 && selectedIds.length <= 4) {
      setIsCompareModalOpen(true);
    }
  }, [selectedIds]);

  const handleRemoveFromCompare = useCallback((personId: string) => {
    toggleSelection(personId);
  }, [toggleSelection]);

  // Get selected people for compare
  const selectedPeople = useMemo(() => {
    return displayPeople.filter((p) => selectedIds.includes(p.id));
  }, [displayPeople, selectedIds]);

  // Scroll to top handler
  const handleScrollToTop = useCallback(() => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Get display names for filters
  const teamName = teams?.find((t) => t.id === filters.teamId)?.name;
  const departmentName = departments?.find((d) => d.id === filters.departmentId)?.name;
  const roleName = roles?.find((r) => r.name === filters.roleId)?.name;


  return (
    <OrgCapabilityGate
      capability="org:member:list"
      permissions={perms}
      fallback={
        <div className="px-10 pt-10">
          <OrgNoAccessState />
        </div>
      }
    >
      <OrgPageHeader
        title={
          <div className="flex items-center gap-2">
            <span>People</span>
            {!canManagePeople && (
              <span className="inline-flex items-center rounded-full border border-slate-700/50 bg-slate-800/30 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                Read-only
              </span>
            )}
          </div>
        }
        description="Explore people, roles, reporting lines, and ownership across your organization."
        actions={
          <div className="flex items-center gap-3">
            <PeopleHelpPopover />
            <PeopleActionsMenu
              canManagePeople={canManagePeople}
              onInvite={() => {
                // TODO: Implement invite flow
                window.location.href = "/org/workspace-settings?tab=members";
              }}
              onAssignTeam={() => setBulkAssignModal({ type: "team", isOpen: true })}
              onAssignDepartment={() => setBulkAssignModal({ type: "department", isOpen: true })}
              onAssignManager={() => setBulkAssignModal({ type: "manager", isOpen: true })}
              onExport={() => {
                // TODO: Implement CSV export
                console.log("Export CSV - coming soon");
              }}
            />
          </div>
        }
        showHelp={false}
      />

      <div className="px-10 pb-10">
        {/* State summary - subtle, only when filters active */}
        <PeopleStateSummary
          visibleCount={displayPeople.length}
          totalCount={basePeople.length}
          filters={filters}
          activeView={filters.quickChip === "all" ? undefined : filters.quickChip === "leaders" ? "Leaders" : filters.quickChip === "unassigned" ? "Unassigned" : undefined}
          activeShortlistName={activeShortlistId ? getShortlist(activeShortlistId)?.name : undefined}
          searchQuery={deferredSearch}
        />

        {/* People insights - KPI cards */}
        <div className="mt-6">
          {isPeopleLoading && !basePeople.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-3xl border border-white/5 bg-slate-900/80"
                />
              ))}
            </div>
          ) : (
            <PeopleInsights people={basePeople} isLoading={isPeopleLoading} />
          )}
        </div>

        {/* Consolidated filters bar: Views + Search + Quick chips + More filters */}
        <div className="mt-6">
          <PeopleFiltersBar
            searchQuery={searchInput}
            onSearchChange={handleSearchChange}
            activeQuickChip={filters.quickChip || "all"}
            onQuickChipChange={handleQuickChipChange}
            onOpenFiltersDrawer={() => setIsFiltersDrawerOpen(true)}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            isLoading={isStructureLoading}
            currentFilters={filters}
            onViewSelect={handleViewSelect}
            shortlists={shortlists}
            activeShortlistId={activeShortlistId}
            onSelectShortlist={handleSelectShortlist}
            onDeleteShortlist={deleteShortlist}
            onClearShortlist={handleClearShortlist}
            canManagePeople={canManagePeople}
          />

          {/* Active filters chips (inline, under FiltersBar) */}
          {(hasAnyPeopleFilter(filters) || activeShortlistId) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {hasAnyPeopleFilter(filters) && (
                <ActiveFiltersChips
                  filters={filters}
                  onRemoveFilter={handleRemoveFilter}
                  teamName={teamName}
                  departmentName={departmentName}
                  roleName={roleName}
                />
              )}
              {activeShortlistId && (
                <button
                  type="button"
                  onClick={handleClearShortlist}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-800/60",
                    "px-2.5 py-1",
                    "text-[11px] text-white/80",
                    "hover:border-slate-600/60 hover:bg-slate-800/80",
                    "transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  )}
                >
                  <span className="font-medium">Shortlist:</span>
                  <span className="max-w-[12rem] truncate">
                    {getShortlist(activeShortlistId)?.name || "Unknown"}
                  </span>
                  <X className="h-3 w-3 text-slate-400 shrink-0" />
                </button>
              )}
            </div>
          )}
        </div>

        {noAccess ? (
          <OrgNoAccessState />
        ) : (
          <>
            {/* Filters drawer */}
            <PeopleFiltersDrawer
              isOpen={isFiltersDrawerOpen}
              onClose={() => setIsFiltersDrawerOpen(false)}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearAll={handleClearAllFilters}
              availableTeams={teams || []}
              availableDepartments={departments || []}
              availableRoles={roles || []}
              teamName={teamName}
              departmentName={departmentName}
              roleName={roleName}
            />

            <div ref={resultsRef}>
            {/* Mobile: Insights Button */}
            <div className="lg:hidden mb-4">
              <button
                type="button"
                onClick={() => setIsInsightsDrawerOpen(true)}
                className={cn(
                  "w-full flex items-center justify-center gap-2",
                  "rounded-full",
                  "px-4 py-2.5",
                  "text-sm font-medium",
                  "bg-slate-900/80",
                  "text-slate-200",
                  "hover:bg-slate-900/90",
                  "border border-white/5",
                  "transition-colors"
                )}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Insights</span>
              </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left: Results (Cards or Table) */}
              <div className="flex-1 min-w-0" ref={resultsContainerRef}>
                {viewMode === "cards" ? (
                  // Cards view
                  <>
                    {isPeopleLoading && !basePeople.length ? (
                      // Loading state
                      <PeopleCardsGrid
                        people={[]}
                        isLoading={true}
                        onOpenPerson={handleRowClick}
                        onTeamClick={handleTeamClick}
                        onDepartmentClick={handleDepartmentClick}
                        onManagerClick={handleManagerClick}
                        selectedIds={selectedIds}
                        onToggleSelection={toggleSelection}
                      />
                    ) : displayPeople.length === 0 ? (
                      // Empty state
                      <div className="mt-6">
                        {hasAnyPeopleFilter(filters) || deferredSearch.trim() ? (
                          <PeopleEmptyState
                            hasFilters={true}
                            onClearFilters={handleClearAll}
                            onResetSearch={handleResetSearch}
                          />
                        ) : (
                          <PeopleEmptyState
                            hasFilters={false}
                            onAddPerson={() => {
                              router.push("/org/people/new");
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      // Cards grid
                      <PeopleCardsGrid
                        people={displayPeople}
                        isLoading={false}
                        onOpenPerson={handleRowClick}
                        onTeamClick={handleTeamClick}
                        onDepartmentClick={handleDepartmentClick}
                        onManagerClick={handleManagerClick}
                        selectedIds={selectedIds}
                        onToggleSelection={toggleSelection}
                      />
                    )}
                  </>
                ) : (
                  // Table view
                  <PeopleTableCard>
                    {isPeopleLoading && !basePeople.length ? (
                      // Loading state inside card
                      <div className="p-6">
                        <div className="space-y-2">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div
                              key={i}
                              className="h-16 animate-pulse rounded-lg border border-white/5 bg-slate-800/30"
                            />
                          ))}
                        </div>
                      </div>
                    ) : displayPeople.length === 0 ? (
                      // Empty state inside card
                      <div className="p-8">
                        {hasAnyPeopleFilter(filters) || deferredSearch.trim() ? (
                          <PeopleEmptyState
                            hasFilters={true}
                            onClearFilters={handleClearAll}
                            onResetSearch={handleResetSearch}
                          />
                        ) : (
                          <PeopleEmptyState
                            hasFilters={false}
                            onAddPerson={() => {
                              router.push("/org/people/new");
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      // Table with sticky header
                      <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
                        <PeopleTable
                          people={displayPeople}
                          sort={filters.sort || "name"}
                          direction={filters.direction || "asc"}
                          onRowClick={handleRowClick}
                          selectedIds={selectedIds}
                          onToggleSelection={toggleSelection}
                          isOwner={isOwner}
                          onDeletePerson={handleDeletePerson}
                        />
                      </div>
                    )}
                  </PeopleTableCard>
                )}
              </div>

              {/* Right: Insights Panel (Desktop) */}
              <div className="hidden lg:block">
                <PeopleInsightsPanel
                  people={displayPeople}
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onScrollToTop={handleScrollToTop}
                />
              </div>
            </div>
          </div>
          </>
        )}

        {/* Person Profile Drawer */}
        <PersonProfileDrawer
          person={selectedPerson}
          people={basePeople}
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          onPersonClick={handleRowClick}
          onFiltersChange={handleFiltersChange}
          orgId={orgId}
        />

        {/* Insights Drawer (Mobile) */}
        <PeopleInsightsDrawer
          isOpen={isInsightsDrawerOpen}
          onClose={() => setIsInsightsDrawerOpen(false)}
          people={displayPeople}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onScrollToTop={handleScrollToTop}
        />

        {/* Selection Bar */}
        <PeopleSelectionBar
          selectedCount={selectedCount}
          canCompare={selectedIds.length >= 2 && selectedIds.length <= 4}
          onCompare={handleCompare}
          onSaveShortlist={() => setIsShortlistModalOpen(true)}
          onClear={clearSelection}
          onAssignTeam={() => setBulkAssignModal({ type: "team", isOpen: true })}
          onAssignDepartment={() => setBulkAssignModal({ type: "department", isOpen: true })}
          onAssignManager={() => setBulkAssignModal({ type: "manager", isOpen: true })}
          canManagePeople={canManagePeople}
        />

        {/* Shortlist Modal */}
        <ShortlistModal
          isOpen={isShortlistModalOpen}
          onClose={() => setIsShortlistModalOpen(false)}
          onSave={handleSaveShortlist}
          personCount={selectedCount}
        />

        {/* Compare Modal - only show if 2+ people selected */}
        {selectedPeople.length >= 2 && (
          <CompareModal
            isOpen={isCompareModalOpen}
            onClose={() => setIsCompareModalOpen(false)}
            people={selectedPeople}
            allPeople={basePeople}
            onRemovePerson={handleRemoveFromCompare}
            onOpenPerson={(person) => {
              setIsCompareModalOpen(false);
              handleRowClick(person);
            }}
          />
        )}

        {/* Bulk Assign Modal */}
        <BulkAssignModal
          isOpen={bulkAssignModal.isOpen}
          onClose={() => setBulkAssignModal({ ...bulkAssignModal, isOpen: false })}
          type={bulkAssignModal.type}
          selectedCount={selectedCount}
          availableTeams={teams || []}
          availableDepartments={departments || []}
          availablePeople={basePeople.map((p) => ({ id: p.id, name: p.name || "Unknown" }))}
          onConfirm={(targetId) => {
            // TODO: Implement bulk assignment API call
            // For now, show a confirmation message
            console.log(`Bulk assign ${selectedCount} people to ${bulkAssignModal.type} ${targetId}`);
            // In production, this would call an API endpoint
            clearSelection();
            setBulkAssignModal({ ...bulkAssignModal, isOpen: false });
          }}
        />

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
    </OrgCapabilityGate>
  );
}

