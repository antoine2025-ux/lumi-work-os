/**
 * Ownership Client Component
 * 
 * Assignment page for assigning owners to teams and departments.
 * Shows all entities with clear indication of ownership status.
 */

"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { OrgApi } from "@/components/org/api";
import { useOrgQuery } from "@/components/org/useOrgQuery";
import { OrgEmptyState } from "@/components/org/OrgEmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function OwnershipClient() {
  const ownQ = useOrgQuery(() => OrgApi.getOwnership(), []);
  const peopleQ = useOrgQuery(() => OrgApi.listPeople(), []);

  const [selectedOwnerByKey, setSelectedOwnerByKey] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  // Extract data with safe defaults - must be done before any conditional returns
  const unowned = ownQ.data?.unowned ?? [];
  const assignments = ownQ.data?.assignments ?? [];
  const people = peopleQ.data?.people ?? [];
  const coverage = ownQ.data?.coverage;
  const structureQ = useOrgQuery(() => OrgApi.getStructure(), []);
  const structure = structureQ.data;
  
  // Build complete list of all teams and departments with ownership status
  const allTeams = useMemo(() => {
    if (!structure) return [];
    const teams = structure.teams ?? [];
    const departments = structure.departments ?? [];
    
    return teams.map(team => {
      const assigned = assignments.find(a => a.entityType === "TEAM" && a.entityId === team.id);
      const department = departments.find(d => d.id === team.departmentId);
      return {
        id: team.id,
        name: team.name,
        departmentName: department?.name ?? null,
        hasOwner: !!team.ownerPersonId || !!assigned,
        ownerPersonId: team.ownerPersonId || assigned?.owner?.id || null,
        ownerName: assigned?.owner?.fullName || null,
      };
    });
  }, [structure, assignments]);
  
  const allDepartments = useMemo(() => {
    if (!structure) return [];
    const departments = structure.departments ?? [];
    
    return departments.map(dept => {
      const assigned = assignments.find(a => a.entityType === "DEPARTMENT" && a.entityId === dept.id);
      return {
        id: dept.id,
        name: dept.name,
        hasOwner: !!assigned,
        ownerPersonId: assigned?.owner?.id || null,
        ownerName: assigned?.owner?.fullName || null,
      };
    });
  }, [structure, assignments]);
  
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
    
    setSavingKey(key);
    setErrors((prev) => ({ ...prev, [key]: null }));

    try {
      if (entityType === "TEAM") {
        await OrgApi.setTeamOwner(entityId, {
          ownerPersonId: ownerPersonId === "__none__" ? null : ownerPersonId,
        });
      } else {
        // For departments, use setDepartmentOwner (direct field update)
        await OrgApi.setDepartmentOwner(entityId, {
          ownerPersonId: ownerPersonId === "__none__" ? null : ownerPersonId,
        });
      }
      // Reload to refresh the list
      window.location.reload();
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
    const currentOwnerId = selectedOwnerByKey[key] || entity.ownerPersonId || "__none__";

    return (
      <div
        key={key}
        className={cn(
          "rounded-xl border p-4 transition-all duration-150",
          entity.hasOwner
            ? "border-white/5 bg-slate-900/40"
            : "border-amber-500/30 bg-amber-950/10"
        )}
      >
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {!entity.hasOwner && (
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              )}
              <div className="font-medium text-slate-100">{entity.name}</div>
            </div>
            {entity.departmentName && (
              <div className="mt-1 text-xs text-slate-500">{entity.departmentName}</div>
            )}
          </div>
          <div className="flex items-center gap-3 min-w-[280px]">
            <Select
              disabled={saving}
              value={currentOwnerId}
              onValueChange={(value) => {
                setSelectedOwnerByKey((prev) => ({ ...prev, [key]: value }));
                handleOwnerChange(entityType, entity.id, value);
              }}
            >
              <SelectTrigger className={cn(
                "bg-slate-900/50 border-white/10 text-slate-100",
                !entity.hasOwner && "border-amber-500/30"
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

  // Format coverage stats, showing "—" when data is unavailable
  const teamsCoverage = coverage?.teams
    ? `${coverage.teams.owned}/${coverage.teams.total}`
    : "—";
  const departmentsCoverage = coverage?.departments
    ? `${coverage.departments.owned}/${coverage.departments.total}`
    : "—";

  return (
    <div className="space-y-6">
      {/* Ownership coverage card */}
      <Card className="border-white/5 bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-100">Ownership coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-400">
            Teams: {teamsCoverage} owned • Departments: {departmentsCoverage} owned
          </div>
        </CardContent>
      </Card>

      {/* Teams section - show all teams */}
      {allTeams.length > 0 && (
        <Card className="border-white/5 bg-slate-900/40">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-100">Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Teams without owners first (warning state) */}
              {teamsWithoutOwners.map((team) => renderEntityRow("TEAM", team))}
              {/* Teams with owners */}
              {teamsWithOwners.map((team) => renderEntityRow("TEAM", team))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Departments section - show all departments */}
      {allDepartments.length > 0 && (
        <Card className="border-white/5 bg-slate-900/40">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-100">Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Departments without owners first (warning state) */}
              {departmentsWithoutOwners.map((dept) => renderEntityRow("DEPARTMENT", dept))}
              {/* Departments with owners */}
              {departmentsWithOwners.map((dept) => renderEntityRow("DEPARTMENT", dept))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
