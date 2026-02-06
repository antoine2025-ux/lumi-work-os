/**
 * Ownership Client Component
 * 
 * Assignment page for assigning owners to teams and departments.
 * Shows all entities with clear indication of ownership status.
 */

"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { isMutationSuccess, publishMutationResult } from "@/lib/org/mutations";

export function OwnershipClient() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const ownQ = useOrgQuery(() => OrgApi.getOwnership(), []);
  const peopleQ = useOrgQuery(() => OrgApi.listPeople(), []);

  const [selectedOwnerByKey, setSelectedOwnerByKey] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  
  // Collapse state for owned sections (unowned always expanded)
  const [ownedTeamsExpanded, setOwnedTeamsExpanded] = useState(false);
  const [ownedDeptsExpanded, setOwnedDeptsExpanded] = useState(false);
  
  // Deep-link focus state
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);
  const focusHandledRef = useRef(false);

  // Extract data with safe defaults - must be done before any conditional returns
  const assignments = ownQ.data?.assignments ?? [];
  // Support both { ok, data: { people } } and { people } response shapes
  const people = (peopleQ.data as any)?.data?.people ?? peopleQ.data?.people ?? [];
  const coverage = ownQ.data?.coverage;
  const structureQ = useOrgQuery(() => OrgApi.getStructure(), []);
  const structure = structureQ.data;
  
  // Build complete list of all teams and departments with ownership status
  // 
  // ID Contract: ownerPersonId is User.id (not WorkspaceMember.id or OrgPerson.id)
  // - people[].id = User.id (from listPeople → OrgPosition.userId)
  // - assigned.owner.id = User.id (from ownerAssignment.ownerPersonId)
  // - team.ownerPersonId = User.id (stored on OrgTeam)
  // - dept.ownerPersonId = User.id (from structure, derived from ownerAssignment)
  //
  // Ownership precedence:
  // 1. Explicit owner assignment (authoritative)
  // 2. Entity-level ownerPersonId (legacy / structural)
  // 3. Resolve ownerName from people list for display
  const allTeams = useMemo(() => {
    if (!structure) return [];
    const teams = structure.teams ?? [];
    const departments = structure.departments ?? [];
    
    return teams.map(team => {
      const assigned = assignments.find(a => a.entityType === "TEAM" && a.entityId === team.id);
      const department = departments.find(d => d.id === team.departmentId);
      // Precedence: assignment owner > entity ownerPersonId
      const ownerId = assigned?.owner?.id || team.ownerPersonId || null;
      // Resolve owner name from assignment first, then people list fallback
      const ownerName = assigned?.owner?.fullName 
        || (ownerId ? people.find(p => p.id === ownerId)?.fullName : null) 
        || null;
      return {
        id: team.id,
        name: team.name,
        departmentName: department?.name ?? null,
        hasOwner: !!ownerId,
        ownerPersonId: ownerId,
        ownerName,
      };
    });
  }, [structure, assignments, people]);
  
  const allDepartments = useMemo(() => {
    if (!structure) return [];
    const departments = structure.departments ?? [];
    
    return departments.map(dept => {
      const assigned = assignments.find(a => a.entityType === "DEPARTMENT" && a.entityId === dept.id);
      // Precedence: assignment owner > entity ownerPersonId (depts use ownerPersonId from structure too)
      const ownerId = assigned?.owner?.id || dept.ownerPersonId || null;
      // Resolve owner name from assignment first, then people list fallback
      const ownerName = assigned?.owner?.fullName 
        || (ownerId ? people.find(p => p.id === ownerId)?.fullName : null) 
        || null;
      return {
        id: dept.id,
        name: dept.name,
        hasOwner: !!ownerId,
        ownerPersonId: ownerId,
        ownerName,
      };
    });
  }, [structure, assignments, people]);
  
  // Initialize selected owner IDs for entities that already have owners
  // Use a ref to track previous owner mappings to prevent unnecessary updates
  const prevOwnerMappingRef = useRef<string>("");
  
  useEffect(() => {
    // Build current owner mapping
    const initial: Record<string, string> = {};
    allTeams.forEach(entity => {
      if (entity.ownerPersonId) {
        initial[`TEAM:${entity.id}`] = entity.ownerPersonId;
      }
    });
    allDepartments.forEach(entity => {
      if (entity.ownerPersonId) {
        initial[`DEPARTMENT:${entity.id}`] = entity.ownerPersonId;
      }
    });
    
    // Create a stable string representation of the mapping
    const currentMapping = JSON.stringify(
      Object.keys(initial).sort().map(key => `${key}:${initial[key]}`)
    );
    
    // Only update if the mapping has actually changed
    if (currentMapping !== prevOwnerMappingRef.current) {
      setSelectedOwnerByKey(prev => {
        // Remove old team/department keys
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          if (key.startsWith('TEAM:') || key.startsWith('DEPARTMENT:')) {
            delete updated[key];
          }
        });
        // Add new mappings
        return { ...updated, ...initial };
      });
      prevOwnerMappingRef.current = currentMapping;
    }
  }, [allTeams, allDepartments]);
  
  // Handle deep-link focus param (?focus=team:<id> or ?focus=department:<id>)
  useEffect(() => {
    // Only handle once per page load
    if (focusHandledRef.current) return;
    
    // Wait for data to load
    if (!structure || allTeams.length === 0 && allDepartments.length === 0) return;
    
    const focusParam = searchParams.get("focus");
    if (!focusParam) return;
    
    // Parse focus param (format: team:<id> or department:<id>)
    const [entityType, entityId] = focusParam.split(":");
    if (!entityType || !entityId) return;
    
    const normalizedType = entityType.toUpperCase();
    const entityKey = `${normalizedType}:${entityId}`;
    
    // Check if entity exists and if it's owned or unowned
    let isOwned = false;
    if (normalizedType === "TEAM") {
      const team = allTeams.find(t => t.id === entityId);
      if (!team) return;
      isOwned = team.hasOwner;
    } else if (normalizedType === "DEPARTMENT") {
      const dept = allDepartments.find(d => d.id === entityId);
      if (!dept) return;
      isOwned = dept.hasOwner;
    } else {
      return;
    }
    
    // Auto-expand the owned section if the focused entity is there
    if (isOwned) {
      if (normalizedType === "TEAM") {
        setOwnedTeamsExpanded(true);
      } else {
        setOwnedDeptsExpanded(true);
      }
    }
    
    // Set highlight state
    setHighlightedKey(entityKey);
    focusHandledRef.current = true;
    
    // Scroll to the element after a brief delay to allow render
    setTimeout(() => {
      const element = document.querySelector(`[data-entity-key="${entityKey}"]`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
    
    // Remove highlight after 4 seconds
    setTimeout(() => {
      setHighlightedKey(null);
    }, 4000);
  }, [searchParams, structure, allTeams, allDepartments]);
  
  // Separate by ownership status
  const teamsWithOwners = useMemo(() => allTeams.filter(t => t.hasOwner), [allTeams]);
  const teamsWithoutOwners = useMemo(() => allTeams.filter(t => !t.hasOwner), [allTeams]);
  const departmentsWithOwners = useMemo(() => allDepartments.filter(d => d.hasOwner), [allDepartments]);
  const departmentsWithoutOwners = useMemo(() => allDepartments.filter(d => !d.hasOwner), [allDepartments]);

  // Check if any entities exist (teams or departments)
  const hasEntities = (coverage?.teams.total ?? 0) > 0 || (coverage?.departments.total ?? 0) > 0;

  // Early returns after all hooks are called
  if (ownQ.loading || peopleQ.loading || structureQ.loading) {
    return <div className="text-sm text-slate-400">Loading ownership…</div>;
  }
  if (ownQ.error || peopleQ.error || structureQ.error) {
    return (
      <div className="text-sm text-red-400">Failed to load: {ownQ.error || peopleQ.error || structureQ.error}</div>
    );
  }

  async function handleOwnerChange(entityType: "TEAM" | "DEPARTMENT", entityId: string, ownerPersonId: string | "__none__") {
    const key = `${entityType}:${entityId}`;
    const isAssigning = ownerPersonId !== "__none__";
    const newOwnerId = ownerPersonId === "__none__" ? null : ownerPersonId;
    
    setSavingKey(key);
    setErrors((prev) => ({ ...prev, [key]: null }));

    try {
      // Call the appropriate API
      const result = entityType === "TEAM"
        ? await OrgApi.setTeamOwner(entityId, { ownerPersonId: newOwnerId })
        : await OrgApi.setDepartmentOwner(entityId, { ownerPersonId: newOwnerId });
      
      // Check if mutation succeeded
      if (!isMutationSuccess(result)) {
        throw new Error(result.error || "Failed to assign owner");
      }
      
      // Publish to mutation bus for Issues page coherence
      publishMutationResult(result);
      
      // Show success toast
      toast({
        description: isAssigning ? "Owner assigned" : "Owner removed",
      });
      
      // Apply returned state instead of refetching
      // Update coverage stats from the returned patch
      ownQ.setData((prev) => {
        if (!prev) return prev;
        
        // Find and update the owner for the affected entity
        const updatedTeams = entityType === "TEAM"
          ? prev.teams.map((t) =>
              t.id === entityId
                ? { ...t, hasOwner: !!newOwnerId, ownerPersonId: newOwnerId, ownerName: newOwnerId ? people.find(p => p.id === newOwnerId)?.fullName ?? null : null }
                : t
            )
          : prev.teams;
        
        const updatedDepartments = entityType === "DEPARTMENT"
          ? prev.departments.map((d) =>
              d.id === entityId
                ? { ...d, hasOwner: !!newOwnerId, ownerPersonId: newOwnerId, ownerName: newOwnerId ? people.find(p => p.id === newOwnerId)?.fullName ?? null : null }
                : d
            )
          : prev.departments;
        
        return {
          ...prev,
          teams: updatedTeams,
          departments: updatedDepartments,
          coverage: result.patch.updatedCoverage,
        };
      });
      
      // Also update structure query to keep team.ownerPersonId in sync
      if (entityType === "TEAM") {
        structureQ.setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            teams: prev.teams.map((t) =>
              t.id === entityId ? { ...t, ownerPersonId: newOwnerId } : t
            ),
          };
        });
      }
      
      setSavingKey(null);
    } catch (error: any) {
      console.error("Failed to assign owner:", error);
      setErrors((prev) => ({
        ...prev,
        [key]: error?.message || "Failed to assign owner. Please try again.",
      }));
      setSavingKey(null);
      // Reset selection on error
      setSelectedOwnerByKey((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
  }
  
  function renderEntityRow(
    entityType: "TEAM" | "DEPARTMENT",
    entity: { id: string; name: string; departmentName?: string | null; hasOwner: boolean; ownerPersonId: string | null; ownerName: string | null }
  ) {
    const key = `${entityType}:${entity.id}`;
    const saving = savingKey === key;
    const error = errors[key];
    // Note: ownerPersonId is User.id (not WorkspaceMember.id or OrgPerson.id)
    // Select value expects User.id to match people[].id
    const currentOwnerId = selectedOwnerByKey[key] || entity.ownerPersonId || "__none__";
    const isHighlighted = highlightedKey === key;
    
    // Check if currentOwnerId exists in people list (for Select to render correctly)
    const ownerInPeopleList = currentOwnerId !== "__none__" && people.some(p => p.id === currentOwnerId);
    
    // Dev-only warning: ID mismatch detection
    if (process.env.NODE_ENV === "development" && entity.ownerPersonId && !ownerInPeopleList) {
      console.warn(`[Ownership] ownerPersonId "${entity.ownerPersonId}" not found in people list for ${entityType}:${entity.id}`);
    }
    
    // Show fallback label only when Select won't render the owner (ID not in people list)
    const showFallbackLabel = entity.hasOwner && entity.ownerName && !ownerInPeopleList;

    return (
      <div
        key={key}
        data-entity-key={key}
        className={cn(
          "rounded-xl border p-4 transition-all duration-300",
          entity.hasOwner
            ? "border-white/5 bg-slate-900/40"
            : "border-amber-500/40 bg-amber-950/20 shadow-sm shadow-amber-900/10",
          isHighlighted && "ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-950"
        )}
      >
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {!entity.hasOwner && (
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              )}
              <div className={cn(
                "font-medium",
                entity.hasOwner ? "text-slate-100" : "text-amber-50"
              )}>{entity.name}</div>
            </div>
            {entity.departmentName && (
              <div className="mt-1 text-xs text-slate-500">{entity.departmentName}</div>
            )}
          </div>
          <div className="flex items-center gap-3 min-w-[280px]">
            {/* Fallback owner label - shown only when Select can't render owner (ID mismatch) */}
            {showFallbackLabel && (
              <span className="text-sm text-slate-400 whitespace-nowrap">
                {entity.ownerName}
              </span>
            )}
            <Select
              disabled={saving}
              value={currentOwnerId}
              onValueChange={(value) => {
                setSelectedOwnerByKey((prev) => ({ ...prev, [key]: value }));
                handleOwnerChange(entityType, entity.id, value);
              }}
            >
              <SelectTrigger className={cn(
                "text-slate-100 transition-colors",
                entity.hasOwner 
                  ? "bg-slate-900/50 border-white/10"
                  : "bg-amber-950/30 border-amber-500/50 hover:border-amber-400/70 focus:border-amber-400"
              )}>
                <SelectValue placeholder="Select owner…" />
              </SelectTrigger>
              <SelectContent>
                {entityType === "TEAM" && (
                  <SelectItem value="__none__">
                    <span className="text-slate-500 italic">No owner</span>
                  </SelectItem>
                )}
                {people.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {error && (
          <div className="mt-2 text-xs text-red-400">{error}</div>
        )}
        {saving && (
          <div className="mt-2 text-xs text-slate-500">Assigning…</div>
        )}
      </div>
    );
  }

  // Empty state when no entities exist
  if (!hasEntities) {
    return (
      <OrgEmptyState
        title="Assign clear owners to teams and departments"
        description="Create teams and departments in Structure, then come back to assign owners."
        primaryActionLabel="Go to Structure"
        primaryActionHref="/org/structure"
      />
    );
  }

  // Calculate coverage stats
  const teamsOwned = coverage?.teams?.owned ?? 0;
  const teamsTotal = coverage?.teams?.total ?? 0;
  const deptsOwned = coverage?.departments?.owned ?? 0;
  const deptsTotal = coverage?.departments?.total ?? 0;
  
  const teamsFullCoverage = teamsTotal > 0 && teamsOwned === teamsTotal;
  const deptsFullCoverage = deptsTotal > 0 && deptsOwned === deptsTotal;
  const allFullCoverage = teamsFullCoverage && deptsFullCoverage;

  return (
    <div className="space-y-6">
      {/* Ownership coverage card */}
      <Card className={cn(
        "transition-colors",
        allFullCoverage 
          ? "border-emerald-500/30 bg-emerald-950/10" 
          : "border-amber-500/20 bg-amber-950/5"
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-100">Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            {/* Teams stat block */}
            <div className={cn(
              "flex-1 rounded-lg px-4 py-3",
              teamsFullCoverage 
                ? "bg-emerald-950/20 border border-emerald-500/20" 
                : "bg-amber-950/20 border border-amber-500/20"
            )}>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Teams</div>
              <div className={cn(
                "text-2xl font-semibold",
                teamsFullCoverage ? "text-emerald-400" : "text-amber-400"
              )}>
                {teamsOwned}<span className="text-slate-500 text-lg">/{teamsTotal}</span>
              </div>
              <div className={cn(
                "text-xs mt-1",
                teamsFullCoverage ? "text-emerald-400/70" : "text-amber-400/70"
              )}>
                {teamsFullCoverage ? "All owned" : `${teamsTotal - teamsOwned} unowned`}
              </div>
            </div>
            
            {/* Departments stat block */}
            <div className={cn(
              "flex-1 rounded-lg px-4 py-3",
              deptsFullCoverage 
                ? "bg-emerald-950/20 border border-emerald-500/20" 
                : "bg-amber-950/20 border border-amber-500/20"
            )}>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Departments</div>
              <div className={cn(
                "text-2xl font-semibold",
                deptsFullCoverage ? "text-emerald-400" : "text-amber-400"
              )}>
                {deptsOwned}<span className="text-slate-500 text-lg">/{deptsTotal}</span>
              </div>
              <div className={cn(
                "text-xs mt-1",
                deptsFullCoverage ? "text-emerald-400/70" : "text-amber-400/70"
              )}>
                {deptsFullCoverage ? "All owned" : `${deptsTotal - deptsOwned} unowned`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Good state when all entities have owners */}
      {allFullCoverage && teamsWithoutOwners.length === 0 && departmentsWithoutOwners.length === 0 && (
        <OrgEmptyState
          variant="good"
          title="All teams and departments have clear owners"
          description="Every team and department has an assigned owner, ensuring clear accountability."
        />
      )}

      {/* === UNOWNED SECTION (Primary - Always Expanded) === */}
      {(teamsWithoutOwners.length > 0 || departmentsWithoutOwners.length > 0) && (
        <div className="space-y-4">
          {/* Unowned Teams */}
          {teamsWithoutOwners.length > 0 && (
            <Card className="border-amber-500/20 bg-amber-950/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-sm font-medium text-amber-100">
                    Unowned teams ({teamsWithoutOwners.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamsWithoutOwners.map((team) => renderEntityRow("TEAM", team))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unowned Departments */}
          {departmentsWithoutOwners.length > 0 && (
            <Card className="border-amber-500/20 bg-amber-950/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-sm font-medium text-amber-100">
                    Unowned departments ({departmentsWithoutOwners.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {departmentsWithoutOwners.map((dept) => renderEntityRow("DEPARTMENT", dept))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* === OWNED SECTION (Secondary - Collapsible) === */}
      {(teamsWithOwners.length > 0 || departmentsWithOwners.length > 0) && (
        <div className="space-y-4">
          {/* Owned Teams */}
          {teamsWithOwners.length > 0 && (
            <Card className="border-white/5 bg-slate-900/30">
              <CardHeader className="pb-3">
                <button
                  type="button"
                  onClick={() => setOwnedTeamsExpanded(!ownedTeamsExpanded)}
                  className="flex items-center gap-2 w-full text-left group"
                >
                  {ownedTeamsExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-500 group-hover:text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-slate-400" />
                  )}
                  <CardTitle className="text-sm font-medium text-slate-400 group-hover:text-slate-300">
                    Owned teams ({teamsWithOwners.length})
                  </CardTitle>
                </button>
              </CardHeader>
              {ownedTeamsExpanded && (
                <CardContent>
                  <div className="space-y-3">
                    {teamsWithOwners.map((team) => renderEntityRow("TEAM", team))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Owned Departments */}
          {departmentsWithOwners.length > 0 && (
            <Card className="border-white/5 bg-slate-900/30">
              <CardHeader className="pb-3">
                <button
                  type="button"
                  onClick={() => setOwnedDeptsExpanded(!ownedDeptsExpanded)}
                  className="flex items-center gap-2 w-full text-left group"
                >
                  {ownedDeptsExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-500 group-hover:text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-slate-400" />
                  )}
                  <CardTitle className="text-sm font-medium text-slate-400 group-hover:text-slate-300">
                    Owned departments ({departmentsWithOwners.length})
                  </CardTitle>
                </button>
              </CardHeader>
              {ownedDeptsExpanded && (
                <CardContent>
                  <div className="space-y-3">
                    {departmentsWithOwners.map((dept) => renderEntityRow("DEPARTMENT", dept))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
